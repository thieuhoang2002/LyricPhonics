using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Infrastructure.Gemini;
using LyricPhonics.Infrastructure.Persistence;
using LyricPhonics.Infrastructure.Services;

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

        // 3. Cấu hình PostgreSQL (Neon Serverless DB) với EF Core
        string? connectionString = configuration.GetConnectionString("NeonPostgres")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL");

        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            string npgsqlConnectionString = NormalizePostgreSqlConnectionString(connectionString);

            services.AddDbContext<LyricPhonicsDbContext>(options =>
            {
                options.UseNpgsql(npgsqlConnectionString, npgsqlOptions =>
                {
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null
                    );
                });
            });

            services.AddScoped<ITrackRepository, TrackRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
        }

        // 4. Đăng ký PhonicsRegenerationService (Groq AI & Gemini Fallback)
        services.AddHttpClient<IPhonicsRegenerationService, PhonicsRegenerationService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // 5. Đăng ký Turnstile, Auth và Admin services
        services.AddHttpClient<ITurnstileService, TurnstileService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdminService, AdminService>();

        // 6. Đăng ký Cloudflare R2 Storage Service
        services.AddSingleton<IStorageService, CloudflareR2StorageService>();

        return services;
    }

    private static string NormalizePostgreSqlConnectionString(string connectionString)
    {
        if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(connectionString);
                var userInfo = uri.UserInfo.Split(':');
                var username = Uri.UnescapeDataString(userInfo[0]);
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
                var database = uri.AbsolutePath.TrimStart('/');
                var port = uri.Port > 0 ? uri.Port : 5432;

                return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
            }
            catch
            {
                return connectionString;
            }
        }

        return connectionString;
    }
}
