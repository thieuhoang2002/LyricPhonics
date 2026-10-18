using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Infrastructure.Persistence;

namespace LyricPhonics.Infrastructure.Services;

/// <summary>
/// Triển khai Quản lý Pool API Key động cho AI Engines (Gemini & Groq).
/// Hỗ trợ nạp động từ DB (Admin Portal thêm/xóa tức thì), xoay vòng Round-Robin,
/// và fallback an toàn 100% về biến môi trường (Environment Variables).
/// </summary>
public class ApiKeyPoolService : IApiKeyPoolService
{
    private readonly LyricPhonicsDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ApiKeyPoolService> _logger;

    // Concurrency index cho Round-Robin
    private static int _geminiRoundRobinIndex = 0;
    private static int _groqRoundRobinIndex = 0;

    public ApiKeyPoolService(
        LyricPhonicsDbContext dbContext,
        IConfiguration configuration,
        ILogger<ApiKeyPoolService> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<string> GetGeminiApiKeyAsync(CancellationToken cancellationToken = default)
    {
        return await GetKeyForProviderAsync("gemini", "GEMINI_API_KEY", "Gemini:ApiKey", cancellationToken);
    }

    public async Task<string> GetGroqApiKeyAsync(CancellationToken cancellationToken = default)
    {
        return await GetKeyForProviderAsync("groq", "GROQ_API_KEY", "Groq:ApiKey", cancellationToken);
    }

    private async Task<string> GetKeyForProviderAsync(
        string provider,
        string envVarName,
        string configPath,
        CancellationToken cancellationToken)
    {
        try
        {
            // 1. Tìm các key trong Database đang Active và không bị Dead
            var dbKeys = await _dbContext.ApiKeys
                .Where(k => k.Provider == provider && k.IsActive && k.Status != "Dead")
                .OrderBy(k => k.Status == "Healthy" ? 0 : 1) // Ưu tiên Healthy trước RateLimited
                .ThenBy(k => k.LatencyMs)
                .Select(k => k.KeyValue)
                .ToListAsync(cancellationToken);

            if (dbKeys.Count > 0)
            {
                int nextVal = provider == "gemini" 
                    ? Interlocked.Increment(ref _geminiRoundRobinIndex) 
                    : Interlocked.Increment(ref _groqRoundRobinIndex);
                int index = (int)((uint)nextVal % (uint)dbKeys.Count);
                string selectedKey = dbKeys[index].Trim();
                if (!string.IsNullOrWhiteSpace(selectedKey))
                {
                    return selectedKey;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi truy vấn API Key từ Database pool cho {Provider}. Sẽ dùng fallback từ biến môi trường.", provider);
        }

        // 2. Fallback sang biến môi trường nếu DB chưa có hoặc DB lỗi
        string? fallbackKey = Environment.GetEnvironmentVariable(envVarName);
        if (string.IsNullOrWhiteSpace(fallbackKey))
        {
            fallbackKey = _configuration[configPath];
        }

        return fallbackKey?.Trim() ?? string.Empty;
    }

    public async Task ReportKeyStatusAsync(
        string provider,
        string keyValue,
        bool isHealthy,
        int latencyMs,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keyValue)) return;

        try
        {
            var keyEntity = await _dbContext.ApiKeys
                .FirstOrDefaultAsync(k => k.Provider == provider && k.KeyValue == keyValue.Trim(), cancellationToken);

            if (keyEntity != null)
            {
                keyEntity.Status = isHealthy ? "Healthy" : "RateLimited";
                keyEntity.LatencyMs = latencyMs;
                keyEntity.LastCheckedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể cập nhật trạng thái API Key {Provider} vào Database.", provider);
        }
    }
}
