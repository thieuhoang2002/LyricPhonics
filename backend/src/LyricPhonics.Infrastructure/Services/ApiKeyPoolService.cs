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
        var allCandidateKeys = new List<string>();

        try
        {
            // 1. Lấy tất cả key trong Database đang Active và không bị Dead
            var dbKeys = await _dbContext.ApiKeys
                .Where(k => k.Provider == provider && k.IsActive && k.Status != "Dead")
                .OrderBy(k => k.Status == "Healthy" ? 0 : 1)
                .Select(k => k.KeyValue)
                .ToListAsync(cancellationToken);

            foreach (var k in dbKeys)
            {
                string trimmed = k.Trim();
                if (!string.IsNullOrWhiteSpace(trimmed) && !allCandidateKeys.Contains(trimmed))
                {
                    allCandidateKeys.Add(trimmed);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi truy vấn API Key từ Database pool cho {Provider}.", provider);
        }

        // 2. Nạp thêm key từ biến môi trường nếu có
        string? envKey = Environment.GetEnvironmentVariable(envVarName);
        if (string.IsNullOrWhiteSpace(envKey))
        {
            envKey = _configuration[configPath];
        }

        if (!string.IsNullOrWhiteSpace(envKey))
        {
            string trimmedEnv = envKey.Trim();
            if (!allCandidateKeys.Contains(trimmedEnv))
            {
                allCandidateKeys.Add(trimmedEnv);
            }
        }

        if (allCandidateKeys.Count == 0)
        {
            return envKey?.Trim() ?? string.Empty;
        }

        // 3. Lọc ra các key chưa vượt quá Quota ngày (RPD)
        var nonExhaustedKeys = allCandidateKeys
            .Where(k => !KeyRateLimiter.IsDailyQuotaExhausted(k, provider))
            .ToList();

        if (nonExhaustedKeys.Count == 0)
        {
            _logger.LogWarning("Tất cả API Key của nhà cung cấp {Provider} đã hết Quota trong ngày!", provider);
            throw new InvalidOperationException("Hôm nay hệ thống hết lượt rồi, chờ ngày mai.");
        }

        // 4. Tìm các key đang có sẵn dung lượng trong phút hiện tại (RPM)
        var readyKeys = nonExhaustedKeys
            .Where(k => KeyRateLimiter.HasRpmCapacity(k, provider))
            .ToList();

        string selectedKey;

        if (readyKeys.Count > 0)
        {
            // Xoay vòng Round-Robin giữa các key đang rảnh
            int nextVal = provider == "gemini" 
                ? Interlocked.Increment(ref _geminiRoundRobinIndex) 
                : Interlocked.Increment(ref _groqRoundRobinIndex);
            int index = (int)((uint)nextVal % (uint)readyKeys.Count);
            selectedKey = readyKeys[index];
        }
        else
        {
            // Tất cả key đều đang chạm ngưỡng RPM của phút này: tìm key có thời gian chờ ngắn nhất
            string bestKey = nonExhaustedKeys[0];
            TimeSpan minWait = KeyRateLimiter.GetWaitTimeForRpm(bestKey, provider);

            for (int i = 1; i < nonExhaustedKeys.Count; i++)
            {
                var wait = KeyRateLimiter.GetWaitTimeForRpm(nonExhaustedKeys[i], provider);
                if (wait < minWait)
                {
                    minWait = wait;
                    bestKey = nonExhaustedKeys[i];
                }
            }

            if (minWait > TimeSpan.Zero)
            {
                _logger.LogInformation("Các key {Provider} đang đạt giới hạn RPM ({Count} req/min). Đang tạm dừng {WaitMs}ms để đảm bảo không bị 429...",
                    provider, KeyRateLimiter.GetRpmLimit(provider), minWait.TotalMilliseconds);
                await Task.Delay(minWait, cancellationToken);
            }

            selectedKey = bestKey;
        }

        // 5. Ghi nhận lượt sử dụng cho key này
        KeyRateLimiter.RecordUsage(selectedKey);
        return selectedKey;
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

/// <summary>
/// Bộ kiểm soát tốc độ gọi (RPM) và hạn mức ngày (RPD) cho từng API Key.
/// </summary>
public static class KeyRateLimiter
{
    private static readonly ConcurrentDictionary<string, KeyUsage> _keyUsageMap = new();

    private class KeyUsage
    {
        public ConcurrentQueue<DateTime> MinuteQueue { get; } = new();
        public int TodayCount = 0;
        public DateTime CurrentDay = DateTime.UtcNow.Date;
        public readonly object LockObj = new();
    }

    public static int GetRpmLimit(string provider) => 
        string.Equals(provider, "groq", StringComparison.OrdinalIgnoreCase) ? 30 : 5;

    public static int GetRpdLimit(string provider) => 
        string.Equals(provider, "groq", StringComparison.OrdinalIgnoreCase) ? 1000 : 20;

    public static bool IsDailyQuotaExhausted(string key, string provider)
    {
        var usage = _keyUsageMap.GetOrAdd(key, _ => new KeyUsage());
        lock (usage.LockObj)
        {
            ResetDayIfExpired(usage);
            return usage.TodayCount >= GetRpdLimit(provider);
        }
    }

    public static bool HasRpmCapacity(string key, string provider)
    {
        var usage = _keyUsageMap.GetOrAdd(key, _ => new KeyUsage());
        CleanMinuteQueue(usage);
        return usage.MinuteQueue.Count < GetRpmLimit(provider);
    }

    public static TimeSpan GetWaitTimeForRpm(string key, string provider)
    {
        var usage = _keyUsageMap.GetOrAdd(key, _ => new KeyUsage());
        CleanMinuteQueue(usage);
        if (usage.MinuteQueue.Count < GetRpmLimit(provider))
        {
            return TimeSpan.Zero;
        }

        if (usage.MinuteQueue.TryPeek(out var oldest))
        {
            var freeAt = oldest.AddMinutes(1).AddMilliseconds(300); // Buffer 300ms an toàn
            var wait = freeAt - DateTime.UtcNow;
            return wait > TimeSpan.Zero ? wait : TimeSpan.Zero;
        }

        return TimeSpan.Zero;
    }

    public static void RecordUsage(string key)
    {
        var usage = _keyUsageMap.GetOrAdd(key, _ => new KeyUsage());
        lock (usage.LockObj)
        {
            ResetDayIfExpired(usage);
            usage.TodayCount++;
            usage.MinuteQueue.Enqueue(DateTime.UtcNow);
        }
    }

    private static void ResetDayIfExpired(KeyUsage usage)
    {
        if (DateTime.UtcNow.Date > usage.CurrentDay)
        {
            usage.CurrentDay = DateTime.UtcNow.Date;
            usage.TodayCount = 0;
        }
    }

    private static void CleanMinuteQueue(KeyUsage usage)
    {
        var oneMinuteAgo = DateTime.UtcNow.AddMinutes(-1);
        while (usage.MinuteQueue.TryPeek(out var time) && time < oneMinuteAgo)
        {
            usage.MinuteQueue.TryDequeue(out _);
        }
    }
}
