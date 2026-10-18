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
    private readonly IApiKeyPoolService? _apiKeyPoolService;
    private readonly ILogger<PhonicsRegenerationService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public PhonicsRegenerationService(
        HttpClient httpClient,
        IConfiguration configuration,
        IOptions<GeminiOptions> geminiOptions,
        ILogger<PhonicsRegenerationService> logger,
        IApiKeyPoolService? apiKeyPoolService = null)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _geminiOptions = geminiOptions.Value;
        _logger = logger;
        _apiKeyPoolService = apiKeyPoolService;
    }

    public async Task<RegeneratedPhonicsResult> RegenerateLinePhonicsAsync(
        string originalText,
        string? language = "vi",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(originalText))
        {
            return new RegeneratedPhonicsResult(string.Empty, string.Empty, string.Empty, string.Empty);
        }

        string targetLang = string.IsNullOrWhiteSpace(language) ? "vi" : language;
        string groqApiKey = string.Empty;
        if (_apiKeyPoolService != null)
        {
            groqApiKey = await _apiKeyPoolService.GetGroqApiKeyAsync(cancellationToken);
        }
        if (string.IsNullOrWhiteSpace(groqApiKey))
        {
            groqApiKey = _configuration["Groq:ApiKey"] 
                ?? Environment.GetEnvironmentVariable("GROQ_API_KEY") 
                ?? string.Empty;
        }

        string groqModel = _configuration["Groq:Model"] ?? "qwen/qwen3.8-27b";

        // 1. Thử gọi Groq AI nếu có API Key
        if (!string.IsNullOrWhiteSpace(groqApiKey))
        {
            try
            {
                _logger.LogInformation("Đang gọi Groq AI ({Model}) để tái tạo phiên âm cho: '{Text}' (target: {Lang})", groqModel, originalText, targetLang);
                return await CallGroqAsync(originalText, targetLang, groqModel, groqApiKey, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Groq AI thất bại, đang fallback sang Gemini...");
            }
        }

        // 2. Fallback sang Google Gemini
        _logger.LogInformation("Đang gọi Gemini AI để tái tạo phiên âm cho: '{Text}' (target: {Lang})", originalText, targetLang);
        return await CallGeminiFallbackAsync(originalText, targetLang, cancellationToken);
    }

    private async Task<RegeneratedPhonicsResult> CallGroqAsync(
        string originalText,
        string targetLang,
        string model,
        string apiKey,
        CancellationToken cancellationToken)
    {
        string systemPrompt = targetLang.ToLowerInvariant() switch
        {
            "en" => @"You are a World-Class Multilingual Music & Vocal Linguistics Expert.
Task: Receive a song lyric line and return a 4-tier JSON structure tailored for English speakers to sing along:
1. originalText: Keep original lyrics as-is.
2. standardPhonetic: Official international phonetic system (Pinyin/Romaji/IPA).
3. phoneticText: Intuitive English-friendly phonetic sing-along syllables matching mouth shape and rhythm (e.g. for Chinese '我爱你' -> 'Woh eye nee').
4. translationText: English meaning translated poetically.",
            "ja" => @"あなたは多言語音楽プロデューサーです。
タスク: 歌詞を受け取り、日本人がカバーして歌えるようにカタカナルビを含む4層のJSONを生成してください:
1. originalText: 原文歌詞。
2. standardPhonetic: 国際標準発音表記 (Pinyin/IPAなど)。
3. phoneticText: 日本語話者が歌いやすいカタカナルビ (例: ウォー・アイ・ニー)。
4. translationText: 日本語の自然な訳。",
            _ => @"Bạn là Chuyên gia Ngôn ngữ Âm nhạc.
Nhiệm vụ: Nhận một câu lời bài hát gốc và trả về cấu trúc JSON 4 tầng để người hát cover:
1. originalText: Giữ nguyên lời bài hát gốc.
2. standardPhonetic: Phiên âm chuẩn quốc tế (Pinyin có dấu cho tiếng Trung, Romaji cho tiếng Nhật, Romaja cho tiếng Hàn, IPA cho tiếng Anh).
3. phoneticText: Phiên âm tiếng Việt bồi CHUẨN KHẨU HÌNH và THANH ĐIỆU để người Việt hát theo nhạc mượt mà.
4. translationText: Bản dịch nghĩa tiếng Việt giàu cảm xúc âm nhạc."
        };

        var requestPayload = new
        {
            model = model,
            messages = new[]
            {
                new
                {
                    role = "system",
                    content = systemPrompt + @"

Return ONLY valid JSON:
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
                    content = $"Generate 4-tier phonetics and translation for:\n{originalText}"
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
        string targetLang,
        CancellationToken cancellationToken)
    {
        string apiKey = string.Empty;
        if (_apiKeyPoolService != null)
        {
            apiKey = await _apiKeyPoolService.GetGeminiApiKeyAsync(cancellationToken);
        }
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = _geminiOptions.ApiKey;
        }
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
                        new(Text: $"Generate 4-tier phonetics and translation for: '{originalText}'. Target audience language is '{targetLang}'. Return valid JSON.")
                    }
                )
            },
            SystemInstruction: new GeminiSystemInstruction(
                Parts: new List<GeminiTextPart>
                {
                    new($@"You are a Music & Vocal Linguistics Expert.
Generate 4-tier lyric structure optimized for '{targetLang}' speakers to sing along:
{{
  ""originalText"": ""..."",
  ""standardPhonetic"": ""..."",
  ""phoneticText"": ""..."",
  ""translationText"": ""...""
}}")
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
