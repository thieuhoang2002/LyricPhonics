using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Infrastructure.Gemini;

/// <summary>
/// Triển khai dịch vụ bóc tách lời bài hát bằng Google Gemini Multimodal Audio API.
/// 
/// 💡 Thiết kế kỹ thuật:
/// 1. IHttpClientFactory & Resilience (Polly):
///    - Không tự 'new HttpClient()' vì gây kiệt quệ Socket (Socket Exhaustion).
///    - HttpClient được quản lý qua DI Container, tích hợp sẵn Polly để tự động Retry
///      khi gặp sự cố nghẽn mạng hoặc mã lỗi 503/429 từ Google.
/// 2. CancellationToken:
///    - Luôn truyền CancellationToken qua tất cả các hàm bất đồng bộ (async/await).
///    - Khi người dùng đóng trình duyệt hoặc hủy request, .NET sẽ tự động dừng gọi Gemini,
///      tiết kiệm tài nguyên và quota cho server.
/// 3. Memory & Stream:
///    - Đọc luồng âm thanh Stream bất đồng bộ sang Base64 để gửi lên Gemini inlineData.
/// </summary>
public class GeminiTranscriptionService : ITranscriptionService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiTranscriptionService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GeminiTranscriptionService(
        HttpClient httpClient,
        IOptions<GeminiOptions> options,
        ILogger<GeminiTranscriptionService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<TranscriptionResult> TranscribeAudioAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        if (audioStream == null || audioStream.Length == 0)
        {
            throw new ArgumentException("Luồng dữ liệu âm thanh không hợp lệ hoặc rỗng.", nameof(audioStream));
        }

        string apiKey = _options.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "MISSING_GEMINI_API_KEY: Chưa cấu hình GEMINI_API_KEY trong appsettings hoặc biến môi trường."
            );
        }

        _logger.LogInformation("Bắt đầu xử lý âm thanh: {FileName} ({MimeType}, {Size} bytes)",
            fileName, mimeType, audioStream.Length);

        // 1. Chuyển đổi dữ liệu âm thanh Stream sang Base64
        string base64Data;
        using (var memoryStream = new MemoryStream())
        {
            await audioStream.CopyToAsync(memoryStream, cancellationToken);
            base64Data = Convert.ToBase64String(memoryStream.ToArray());
        }

        // 2. Chuẩn bị Request Payload gửi lên Gemini
        var requestPayload = new GeminiGenerateContentRequest(
            Contents: new List<GeminiContent>
            {
                new(
                    Parts: new List<GeminiPart>
                    {
                        new(InlineData: new GeminiInlineData(mimeType, base64Data)),
                        new(Text: GeminiPrompts.UserInstruction)
                    }
                )
            },
            SystemInstruction: new GeminiSystemInstruction(
                Parts: new List<GeminiTextPart>
                {
                    new(GeminiPrompts.SystemPrompt)
                }
            ),
            GenerationConfig: new GeminiGenerationConfig(
                ResponseMimeType: "application/json",
                Temperature: 0.2
            )
        );

        // 3. Thực thi gọi Gemini với mô hình chính, nếu lỗi sẽ tự động thử mô hình dự phòng
        string? rawResponseJson = null;

        try
        {
            _logger.LogInformation("Gửi yêu cầu tới mô hình chính: {Model}", _options.Model);
            rawResponseJson = await CallGeminiModelAsync(_options.Model, apiKey, requestPayload, cancellationToken);
        }
        catch (Exception primaryEx)
        {
            _logger.LogWarning(primaryEx, "Mô hình chính {Model} thất bại. Đang thử mô hình dự phòng: {Fallback}",
                _options.Model, _options.FallbackModel);

            try
            {
                rawResponseJson = await CallGeminiModelAsync(_options.FallbackModel, apiKey, requestPayload, cancellationToken);
            }
            catch (Exception fallbackEx)
            {
                _logger.LogError(fallbackEx, "Cả hai mô hình Gemini đều thất bại.");
                throw new ApplicationException(
                    "Dịch vụ AI hiện đang quá tải hoặc gặp lỗi. Vui lòng thử lại sau ít phút.",
                    fallbackEx
                );
            }
        }

        // 4. Phân tích kết quả JSON trả về từ Gemini
        return ParseGeminiResponse(rawResponseJson, fileName);
    }

    private async Task<string> CallGeminiModelAsync(
        string modelName,
        string apiKey,
        GeminiGenerateContentRequest payload,
        CancellationToken cancellationToken)
    {
        string endpoint = $"{_options.BaseUrl}/models/{modelName}:generateContent?key={apiKey}";

        using var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            string errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Gemini API trả về mã lỗi HTTP {StatusCode}: {Error}", response.StatusCode, errorContent);
            throw new HttpRequestException($"Gemini API Error (HTTP {response.StatusCode}): {errorContent}");
        }

        var geminiResponse = await response.Content.ReadFromJsonAsync<GeminiGenerateContentResponse>(
            JsonOptions, cancellationToken
        );

        string? rawText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrWhiteSpace(rawText))
        {
            throw new InvalidOperationException("Gemini API không trả về nội dung hợp lệ.");
        }

        return rawText;
    }

    private TranscriptionResult ParseGeminiResponse(string rawJson, string defaultFileName)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<GeminiTranscriptionOutput>(rawJson, JsonOptions);

            var metadata = new TranscriptionMetadata(
                Title: !string.IsNullOrWhiteSpace(parsed?.Metadata?.Title)
                    ? parsed.Metadata.Title
                    : Path.GetFileNameWithoutExtension(defaultFileName),
                Artist: !string.IsNullOrWhiteSpace(parsed?.Metadata?.Artist)
                    ? parsed.Metadata.Artist
                    : "Unknown Artist",
                DetectedLanguage: parsed?.Metadata?.DetectedLanguage ?? "auto"
            );

            var lines = new List<LyricLine>();
            int index = 1;

            if (parsed?.Lines != null)
            {
                foreach (var line in parsed.Lines)
                {
                    lines.Add(new LyricLine(
                        Id: $"line-{index++}",
                        StartTime: Math.Max(0, line.StartTime),
                        EndTime: Math.Max(line.StartTime, line.EndTime),
                        OriginalText: line.OriginalText?.Trim() ?? string.Empty,
                        PhoneticText: line.PhoneticText?.Trim() ?? string.Empty,
                        TranslationText: line.TranslationText?.Trim(),
                        StandardPhonetic: line.StandardPhonetic?.Trim()
                    ));
                }
            }

            // Sắp xếp các dòng theo StartTime để thuật toán Binary Search hoạt động chuẩn xác
            var sortedLines = lines.OrderBy(l => l.StartTime).ToList();

            return new TranscriptionResult(metadata, sortedLines);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Lỗi khi parse JSON từ Gemini: {RawJson}", rawJson);
            throw new FormatException("Định dạng dữ liệu trả về từ AI không đúng cấu trúc mong đợi.", ex);
        }
    }
}
