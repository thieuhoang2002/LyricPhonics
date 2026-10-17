using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Infrastructure.Gemini;

namespace LyricPhonics.Infrastructure.Services;

/// <summary>
/// Triển khai dịch vụ tái tạo phiên âm 4 tầng tức thì khi người dùng chỉnh sửa lời gốc.
/// Hỗ trợ Groq AI LPU (siêu tốc vài trăm token/s) và tự động Fallback sang Gemini nếu cần.
/// </summary>
public class PhonicsRegenerationService : IPhonicsRegenerationService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly GeminiOptions _geminiOptions;
    private readonly ILogger<PhonicsRegenerationService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public PhonicsRegenerationService(
        HttpClient httpClient,
        IConfiguration configuration,
        IOptions<GeminiOptions> geminiOptions,
        ILogger<PhonicsRegenerationService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _geminiOptions = geminiOptions.Value;
        _logger = logger;
    }

    public async Task<RegeneratedPhonicsResult> RegenerateLinePhonicsAsync(
        string originalText,
        string? language = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(originalText))
        {
            return new RegeneratedPhonicsResult(string.Empty, string.Empty, string.Empty, string.Empty);
        }

        string groqApiKey = _configuration["Groq:ApiKey"] 
            ?? Environment.GetEnvironmentVariable("GROQ_API_KEY") 
            ?? string.Empty;

        string groqModel = _configuration["Groq:Model"] ?? "qwen/qwen3.8-27b";

        // 1. Thử gọi Groq AI nếu có API Key
        if (!string.IsNullOrWhiteSpace(groqApiKey))
        {
            try
            {
                _logger.LogInformation("Đang gọi Groq AI ({Model}) để tái tạo phiên âm cho: '{Text}'", groqModel, originalText);
                return await CallGroqAsync(originalText, groqModel, groqApiKey, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Groq AI thất bại, đang fallback sang Gemini...");
            }
        }

        // 2. Fallback sang Google Gemini
        _logger.LogInformation("Đang gọi Gemini AI để tái tạo phiên âm cho: '{Text}'", originalText);
        return await CallGeminiFallbackAsync(originalText, cancellationToken);
    }

    private async Task<RegeneratedPhonicsResult> CallGroqAsync(
        string originalText,
        string model,
        string apiKey,
        CancellationToken cancellationToken)
    {
        var requestPayload = new
        {
            model = model,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = @"Bạn là Chuyên gia Ngôn ngữ Âm nhạc.
Nhiệm vụ: Nhận một câu lời bài hát gốc và trả về cấu trúc JSON 4 tầng để người Việt hát cover:
1. originalText: Giữ nguyên lời bài hát gốc.
2. standardPhonetic: Phiên âm chuẩn quốc tế (Pinyin có dấu cho tiếng Trung, Romaji cho tiếng Nhật, Romaja cho tiếng Hàn, IPA cho tiếng Anh).
3. phoneticText: Phiên âm tiếng Việt bồi CHUẨN KHẨU HÌNH và THANH ĐIỆU để người Việt hát theo nhạc mượt mà.
4. translationText: Bản dịch nghĩa tiếng Việt giàu cảm xúc âm nhạc.

Đầu ra BẮT BUỘC chỉ là JSON hợp lệ theo định dạng:
{
  ""originalText"": ""..."",
  ""standardPhonetic"": ""..."",
  ""phoneticText"": ""..."",
  ""translationText"": ""...""
}"
                },
                new
                {
                    role = "user",
                    content = $"Hãy tạo phiên âm chuẩn, phiên âm bồi tiếng Việt và dịch nghĩa cho câu hát sau:\n{originalText}"
                }
            },
            temperature = 0.2,
            response_format = new { type = "json_object" }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions")
        {
            Content = JsonContent.Create(requestPayload)
        };
        httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(JsonOptions, cancellationToken);
        string? content = result?.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("Groq API không trả về nội dung hợp lệ.");
        }

        var parsed = JsonSerializer.Deserialize<RegeneratedPhonicsResult>(content, JsonOptions);
        return parsed ?? new RegeneratedPhonicsResult(originalText, string.Empty, string.Empty, string.Empty);
    }

    private async Task<RegeneratedPhonicsResult> CallGeminiFallbackAsync(
        string originalText,
        CancellationToken cancellationToken)
    {
        string apiKey = _geminiOptions.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty;
        }

        string endpoint = $"{_geminiOptions.BaseUrl}/models/{_geminiOptions.FallbackModel}:generateContent?key={apiKey}";

        var requestPayload = new GeminiGenerateContentRequest(
            Contents: new List<GeminiContent>
            {
                new(
                    Parts: new List<GeminiPart>
                    {
                        new(Text: $"Hãy tạo phiên âm chuẩn quốc tế (standardPhonetic), phiên âm bồi tiếng Việt chuẩn khẩu hình (phoneticText), và dịch nghĩa tiếng Việt (translationText) cho câu hát sau: '{originalText}'. Trả về JSON.")
                    }
                )
            },
            SystemInstruction: new GeminiSystemInstruction(
                Parts: new List<GeminiTextPart>
                {
                    new(@"Bạn là Chuyên gia Ngôn ngữ Âm nhạc. Hãy trả về JSON duy nhất với 4 trường:
{
  ""originalText"": ""..."",
  ""standardPhonetic"": ""..."",
  ""phoneticText"": ""..."",
  ""translationText"": ""...""
}")
                }
            ),
            GenerationConfig: new GeminiGenerationConfig(
                ResponseMimeType: "application/json",
                Temperature: 0.2
            )
        );

        using var response = await _httpClient.PostAsJsonAsync(endpoint, requestPayload, cancellationToken);
        response.EnsureSuccessStatusCode();

        var geminiResponse = await response.Content.ReadFromJsonAsync<GeminiGenerateContentResponse>(JsonOptions, cancellationToken);
        string? rawText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrWhiteSpace(rawText))
        {
            return new RegeneratedPhonicsResult(originalText, string.Empty, string.Empty, string.Empty);
        }

        var parsed = JsonSerializer.Deserialize<RegeneratedPhonicsResult>(rawText, JsonOptions);
        return parsed ?? new RegeneratedPhonicsResult(originalText, string.Empty, string.Empty, string.Empty);
    }
}

public record GroqChatCompletionResponse(
    [property: JsonPropertyName("choices")] List<GroqChoice>? Choices
);

public record GroqChoice(
    [property: JsonPropertyName("message")] GroqMessage? Message
);

public record GroqMessage(
    [property: JsonPropertyName("content")] string? Content
);
