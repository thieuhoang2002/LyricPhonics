using System.Threading;
using System.Threading.Tasks;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Quản lý pool API key động (Gemini, Groq), hỗ trợ xoay vòng (Round-Robin), 
/// cân bằng tải, tự động đánh dấu lỗi RateLimit (429) và fallback đa tầng.
/// </summary>
public interface IApiKeyPoolService
{
    /// <summary>
    /// Lấy API Key khả dụng tốt nhất cho Google Gemini (từ Database pool hoặc fallback biến môi trường).
    /// </summary>
    Task<string> GetGeminiApiKeyAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy API Key khả dụng tốt nhất cho Groq LPU (từ Database pool hoặc fallback biến môi trường).
    /// </summary>
    Task<string> GetGroqApiKeyAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Báo cáo tình trạng sau khi gọi AI (thành công hoặc bị RateLimited/Dead) để cập nhật DB pool.
    /// </summary>
    Task ReportKeyStatusAsync(string provider, string keyValue, bool isHealthy, int latencyMs, CancellationToken cancellationToken = default);
}
