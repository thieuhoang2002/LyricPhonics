using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Infrastructure.Gemini;

namespace LyricPhonics.Infrastructure;

/// <summary>
/// Phương thức mở rộng cấu hình Dependency Injection cho tầng Infrastructure.
/// 
/// 💡 Thiết kế kỹ thuật (Enterprise Resilience with Polly v8):
/// - 'AddStandardResilienceHandler': Tính năng mới cực mạnh trong .NET 8.
/// - Tự động thiết lập:
///   1. Rate Limiting (giới hạn tần suất gọi).
///   2. Total Request Timeout (ngắt kết nối khi quá thời gian cho phép).
///   3. Retry Policy (thử lại với Exponential Backoff khi gặp lỗi mạng/mã 503/429).
///   4. Circuit Breaker (ngắt mạch khi dịch vụ AI sập để bảo vệ hệ thống không bị quá tải).
///   5. Attempt Timeout (thời gian tối đa cho mỗi lần gọi đơn lẻ).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. Ánh xạ cấu hình GeminiOptions từ appsettings.json
        services.Configure<GeminiOptions>(
            configuration.GetSection(GeminiOptions.SectionName)
        );

        // 2. Đăng ký Typed HttpClient với Polly Resilience Handler
        services.AddHttpClient<ITranscriptionService, GeminiTranscriptionService>(client =>
        {
            client.Timeout = TimeSpan.FromMinutes(4); // Giới hạn tổng thể cho tác vụ phân tích file âm thanh/video
        })
        .AddStandardResilienceHandler(options =>
        {
            // Thiết lập timeout phù hợp cho Gemini Audio/Video Multimodal (thời gian bóc tách có thể từ 20-60 giây)
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(90);
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(180); // Polly v8: SamplingDuration >= 2 * AttemptTimeout
            options.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(4);

            // Tùy chỉnh Retry Policy cho phù hợp với API AI
            options.Retry.MaxRetryAttempts = 2;
            options.Retry.Delay = TimeSpan.FromSeconds(2);
            options.Retry.BackoffType = Polly.DelayBackoffType.Exponential;
            options.Retry.UseJitter = true; // Thêm độ lệch ngẫu nhiên để tránh hiện tượng dồn cục (Thundering Herd)
        });

        return services;
    }
}
