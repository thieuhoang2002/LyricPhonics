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

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        string secretKey = _configuration["Cloudflare:TurnstileSecretKey"] ?? "1x0000000000000000000000000000000AA";

        try
        {
            var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = secretKey,
                ["response"] = token,
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
                return true;
            }

            _logger.LogWarning("Cloudflare Turnstile token validation thất bại: {Response}", responseJson);
            return _environment.IsDevelopment();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi kết nối tới Cloudflare Turnstile service.");
            return _environment.IsDevelopment();
        }
    }
}
