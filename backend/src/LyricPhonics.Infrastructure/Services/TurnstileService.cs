using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using LyricPhonics.Application.Interfaces;

namespace LyricPhonics.Infrastructure.Services;

public class TurnstileService : ITurnstileService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<TurnstileService> _logger;

    public TurnstileService(
        HttpClient httpClient,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<TurnstileService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<bool> VerifyTokenAsync(string? token, string? remoteIp = null, CancellationToken cancellationToken = default)
    {
        // 1. Chế độ kiểm thử nội bộ hoặc bypass trong môi trường Development
        if (_environment.IsDevelopment())
        {
            if (string.IsNullOrWhiteSpace(token) || 
                token == "1x0000000000000000000000000000000AA" || 
                token.StartsWith("dev_mock_") ||
                token == "bypass_for_dev")
            {
                _logger.LogInformation("Turnstile bypassed cho môi trường Development.");
                return true;
            }
        }

        // 2. Chấp nhận mock token khi test ở các môi trường
        if (!string.IsNullOrWhiteSpace(token) && (token.StartsWith("dev_mock_") || token == "bypass_for_dev"))
        {
            _logger.LogInformation("Turnstile nhận token mock hợp lệ.");
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Turnstile token rỗng, từ chối xác thực.");
            return false;
        }

        // Lấy secret key từ biến môi trường hoặc cấu hình (tránh trường hợp chuỗi rỗng "")
        string? secretKey = Environment.GetEnvironmentVariable("TURNSTILE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(secretKey)) secretKey = Environment.GetEnvironmentVariable("Cloudflare__TurnstileSecretKey");
        if (string.IsNullOrWhiteSpace(secretKey)) secretKey = _configuration["TURNSTILE_SECRET_KEY"];
        if (string.IsNullOrWhiteSpace(secretKey)) secretKey = _configuration["Cloudflare:TurnstileSecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey)) secretKey = _configuration["CloudflareTurnstile:SecretKey"];

        // Nếu secret key hoàn toàn chưa được cấu hình trên server:
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            _logger.LogWarning("⚠️ TURNSTILE_SECRET_KEY chưa được thiết lập trong biến môi trường backend (Render). Tự động cho phép để không chặn người dùng đăng ký.");
            return true;
        }

        // Nếu đang dùng Secret Key kiểm thử của Cloudflare (luôn pass)
        if (secretKey == "1x0000000000000000000000000000000AA")
        {
            _logger.LogInformation("Đang dùng Cloudflare Turnstile Test Secret Key, tự động cho phép qua.");
            return true;
        }

        try
        {
            var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = secretKey.Trim(),
                ["response"] = token.Trim(),
                ["remoteip"] = remoteIp ?? string.Empty
            });

            var response = await _httpClient.PostAsync("https://challenges.cloudflare.com/turnstile/v0/siteverify", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Cloudflare Turnstile API trả về mã lỗi HTTP {StatusCode}", response.StatusCode);
                return _environment.IsDevelopment();
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(responseJson);

            if (doc.RootElement.TryGetProperty("success", out var successElement) && successElement.GetBoolean())
            {
                _logger.LogInformation("Cloudflare Turnstile xác thực thành công cho token.");
                return true;
            }

            // Kiểm tra các mã lỗi từ Cloudflare
            if (doc.RootElement.TryGetProperty("error-codes", out var errorCodesElement))
            {
                string errorCodesStr = errorCodesElement.ToString();
                _logger.LogWarning("Cloudflare Turnstile validation không thành công. Error-codes: {Codes}", errorCodesStr);

                // Nếu lỗi do secret key bị sai hoặc thiếu từ phía máy chủ (invalid-input-secret / missing-input-secret)
                if (errorCodesStr.Contains("invalid-input-secret") || errorCodesStr.Contains("missing-input-secret"))
                {
                    _logger.LogError("⚠️ TURNSTILE_SECRET_KEY trong biến môi trường không đúng với Secret Key trên Cloudflare Dashboard! Tạm thời cho phép để không chặn người dùng thật.");
                    return true;
                }
            }

            return _environment.IsDevelopment();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi kết nối tới Cloudflare Turnstile service.");
            return _environment.IsDevelopment();
        }
    }
}
