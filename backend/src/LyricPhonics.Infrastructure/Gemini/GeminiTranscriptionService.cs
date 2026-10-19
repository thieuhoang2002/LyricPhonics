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
/// 3. Memory & Stream (Tối ưu hóa LOH & Tiết kiệm RAM):
///    - Sử dụng Google Gemini File API kết hợp luồng StreamContent để stream trực tiếp
///      tệp âm thanh/video mà không cần đọc toàn bộ vào bộ nhớ (MemoryStream.ToArray)
///      hay chuỗi Base64 khổng lồ, loại bỏ nguy cơ phân mảnh Large Object Heap (LOH)
///      và ngăn chặn Out-Of-Memory (OOM) trên các môi trường RAM hạn chế (như Render 512MB).
/// </summary>
public class GeminiTranscriptionService : ITranscriptionService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly IApiKeyPoolService? _apiKeyPoolService;
    private readonly ILogger<GeminiTranscriptionService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GeminiTranscriptionService(
        HttpClient httpClient,
        IOptions<GeminiOptions> options,
        ILogger<GeminiTranscriptionService> logger,
        IApiKeyPoolService? apiKeyPoolService = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _apiKeyPoolService = apiKeyPoolService;
    }

    public async Task<TranscriptionResult> TranscribeAudioAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
        string targetLanguage = "vi",
        CancellationToken cancellationToken = default)
    {
        if (audioStream == null || audioStream.Length == 0)
        {
            throw new ArgumentException("Luồng dữ liệu âm thanh không hợp lệ hoặc rỗng.", nameof(audioStream));
        }

        string apiKey = string.Empty;
        if (_apiKeyPoolService != null)
        {
            apiKey = await _apiKeyPoolService.GetGeminiApiKeyAsync(cancellationToken);
        }
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = _options.ApiKey;
        }
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

        _logger.LogInformation("Bắt đầu xử lý âm thanh: {FileName} ({MimeType}, {Size} bytes, targetLang: {Lang})",
            fileName, mimeType, audioStream.CanSeek ? audioStream.Length : -1, targetLanguage);

        string? uploadedFileResourceName = null;
        GeminiPart mediaPart;

        try
        {
            // 1. Thử tải lên bằng Gemini File API để stream trực tiếp không tốn RAM / LOH
            var uploadResult = await UploadMediaFileViaStreamAsync(audioStream, mimeType, fileName, apiKey, cancellationToken);
            if (uploadResult != null)
            {
                uploadedFileResourceName = uploadResult.Value.FileResourceName;
                mediaPart = new GeminiPart(FileData: new GeminiFileData(mimeType, uploadResult.Value.FileUri));
            }
            else
            {
                // Fallback an toàn sang inlineData nếu File API không khả dụng (ví dụ trong môi trường test)
                _logger.LogInformation("Dùng chế độ inlineData cho tệp: {FileName}", fileName);
                if (audioStream.CanSeek && audioStream.Position != 0)
                {
                    audioStream.Position = 0;
                }

                string base64Data;
                using (var memoryStream = new MemoryStream())
                {
                    await audioStream.CopyToAsync(memoryStream, cancellationToken);
                    base64Data = Convert.ToBase64String(memoryStream.ToArray());
                }
                mediaPart = new GeminiPart(InlineData: new GeminiInlineData(mimeType, base64Data));
            }

            // 2. Chuẩn bị Request Payload gửi lên Gemini
            var requestPayload = new GeminiGenerateContentRequest(
                Contents: new List<GeminiContent>
                {
                    new(
                        Parts: new List<GeminiPart>
                        {
                            mediaPart,
                            new(Text: GeminiPrompts.BuildUserInstruction(targetLanguage))
                        }
                    )
                },
                SystemInstruction: new GeminiSystemInstruction(
                    Parts: new List<GeminiTextPart>
                    {
                        new(GeminiPrompts.BuildSystemPrompt(targetLanguage))
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
        finally
        {
            // 5. Tự động dọn dẹp file tạm trên Gemini File API
            if (!string.IsNullOrWhiteSpace(uploadedFileResourceName))
            {
                _ = DeleteGeminiFileAsync(uploadedFileResourceName, apiKey);
            }
        }
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

    /// <summary>
    /// Tải luồng âm thanh Stream trực tiếp lên Google Gemini File API thông qua giao thức Resumable Upload.
    /// Giúp loại bỏ hoàn toàn việc cấp phát mảng byte[] trên Large Object Heap (LOH) và chuỗi Base64 ~66MB.
    /// </summary>
    private async Task<(string FileUri, string FileResourceName)?> UploadMediaFileViaStreamAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
        string apiKey,
        CancellationToken cancellationToken)
    {
        try
        {
            long contentLength = audioStream.CanSeek ? audioStream.Length : -1;
            string displayName = Path.GetFileName(fileName);

            // Bước 1: Khởi tạo Resumable Upload Session
            string initiateUrl = $"https://generativelanguage.googleapis.com/upload/v1beta/files?key={apiKey}";
            using var initRequest = new HttpRequestMessage(HttpMethod.Post, initiateUrl);
            initRequest.Headers.Add("X-Goog-Upload-Protocol", "resumable");
            initRequest.Headers.Add("X-Goog-Upload-Command", "start");
            if (contentLength > 0)
            {
                initRequest.Headers.Add("X-Goog-Upload-Header-Content-Length", contentLength.ToString());
            }
            initRequest.Headers.Add("X-Goog-Upload-Header-Content-Type", mimeType);

            var metadataPayload = new { file = new { display_name = displayName } };
            initRequest.Content = new StringContent(
                JsonSerializer.Serialize(metadataPayload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            using var initResponse = await _httpClient.SendAsync(initRequest, cancellationToken);
            if (!initResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Không thể khởi tạo Gemini File API upload (HTTP {Status}).", initResponse.StatusCode);
                return null;
            }

            if (!initResponse.Headers.TryGetValues("X-Goog-Upload-URL", out var uploadUrls))
            {
                _logger.LogWarning("Gemini File API không trả về header X-Goog-Upload-URL.");
                return null;
            }

            string uploadUrl = uploadUrls.First();

            // Bước 2: Stream trực tiếp dữ liệu từ audioStream sang uploadUrl
            if (audioStream.CanSeek && audioStream.Position != 0)
            {
                audioStream.Position = 0;
            }

            using var uploadRequest = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
            uploadRequest.Headers.Add("X-Goog-Upload-Offset", "0");
            uploadRequest.Headers.Add("X-Goog-Upload-Command", "upload, finalize");

            var streamContent = new StreamContent(audioStream);
            if (contentLength > 0)
            {
                streamContent.Headers.ContentLength = contentLength;
            }
            streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
            uploadRequest.Content = streamContent;

            using var uploadResponse = await _httpClient.SendAsync(uploadRequest, cancellationToken);
            if (!uploadResponse.IsSuccessStatusCode)
            {
                string err = await uploadResponse.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Upload dữ liệu lên Gemini File API thất bại (HTTP {Status}): {Err}", uploadResponse.StatusCode, err);
                return null;
            }

            var uploadResult = await uploadResponse.Content.ReadFromJsonAsync<GeminiFileUploadResponse>(JsonOptions, cancellationToken);
            if (uploadResult?.File?.Uri != null && uploadResult?.File?.Name != null)
            {
                _logger.LogInformation("Đã tải tệp lên Gemini File API thành công: {Uri} ({Name})", uploadResult.File.Uri, uploadResult.File.Name);
                return (uploadResult.File.Uri, uploadResult.File.Name);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi xảy ra trong quá trình upload tệp lên Gemini File API.");
            return null;
        }
    }

    /// <summary>
    /// Xóa tệp tạm đã tải lên Gemini File API sau khi bóc tách xong để giải phóng bộ nhớ lưu trữ trên Google Cloud.
    /// </summary>
    private async Task DeleteGeminiFileAsync(string fileResourceName, string apiKey)
    {
        try
        {
            string deleteUrl = $"{_options.BaseUrl}/{fileResourceName}?key={apiKey}";
            using var response = await _httpClient.DeleteAsync(deleteUrl);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Đã dọn dẹp file tạm trên Gemini File API: {ResourceName}", fileResourceName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể dọn dẹp file tạm {ResourceName} trên Gemini File API.", fileResourceName);
        }
    }
}
