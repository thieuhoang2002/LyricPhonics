using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Infrastructure.Gemini;

/// <summary>
/// Triển khai dịch vụ chuyển đổi âm thanh sang bản hòa âm Piano MIDI bằng Google Gemini File API.
/// 
/// 💡 Thiết kế kỹ thuật:
/// 1. Tận dụng Gemini File API (Streaming Upload) để stream file âm thanh mà không buffer byte[] vào RAM,
///    ngăn ngừa tình trạng tràn bộ nhớ LOH (Large Object Heap) và Out-Of-Memory.
/// 2. Bóc tách chi tiết: Nốt nhạc 2 tay, Hợp âm theo ô nhịp, Cấu trúc bài hát, BPM và Điệu tính.
/// 3. Dọn dẹp tự động tệp tạm trên Google Cloud sau khi phân tích xong.
/// </summary>
public class GeminiPianoTranscriptionService : IPianoTranscriptionService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly IApiKeyPoolService? _apiKeyPoolService;
    private readonly ILogger<GeminiPianoTranscriptionService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GeminiPianoTranscriptionService(
        HttpClient httpClient,
        IOptions<GeminiOptions> options,
        ILogger<GeminiPianoTranscriptionService> logger,
        IApiKeyPoolService? apiKeyPoolService = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _apiKeyPoolService = apiKeyPoolService;
    }

    public async Task<PianoTranscriptionResult> TranscribePianoAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
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

        _logger.LogInformation("Bắt đầu phân tích Piano Cover: {FileName} ({MimeType}, {Size} bytes)",
            fileName, mimeType, audioStream.CanSeek ? audioStream.Length : -1);

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
                _logger.LogInformation("Dùng chế độ inlineData cho tệp Piano: {FileName}", fileName);
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
                            new(Text: GeminiPianoPrompts.UserInstruction)
                        }
                    )
                },
                SystemInstruction: new GeminiSystemInstruction(
                    Parts: new List<GeminiTextPart>
                    {
                        new(GeminiPianoPrompts.SystemPrompt)
                    }
                ),
                GenerationConfig: new GeminiGenerationConfig(
                    ResponseMimeType: "application/json",
                    Temperature: 0.1
                )
            );

            // 3. Thực thi gọi Gemini với mô hình chính, nếu lỗi sẽ tự động thử mô hình dự phòng
            string? rawResponseJson = null;

            try
            {
                _logger.LogInformation("Gửi yêu cầu phân tích Piano tới mô hình: {Model}", _options.Model);
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
                    _logger.LogError(fallbackEx, "Cả hai mô hình Gemini đều thất bại khi phân tích Piano.");
                    throw new ApplicationException(
                        "Dịch vụ AI hiện đang quá tải hoặc gặp lỗi. Vui lòng thử lại sau ít phút.",
                        fallbackEx
                    );
                }
            }

            // 4. Phân tích kết quả JSON trả về từ Gemini
            return ParsePianoResponse(rawResponseJson, fileName);
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
            throw new InvalidOperationException("Gemini API không trả về nội dung hòa âm Piano hợp lệ.");
        }

        return rawText;
    }

    private PianoTranscriptionResult ParsePianoResponse(string rawJson, string defaultFileName)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<PianoTranscriptionResult>(rawJson, JsonOptions);
            if (parsed == null)
            {
                throw new FormatException("Không thể phân tích dữ liệu Piano từ kết quả của AI.");
            }

            string title = !string.IsNullOrWhiteSpace(parsed.Title)
                ? parsed.Title
                : Path.GetFileNameWithoutExtension(defaultFileName);

            string artist = !string.IsNullOrWhiteSpace(parsed.Artist)
                ? parsed.Artist
                : "Unknown Artist";

            string key = !string.IsNullOrWhiteSpace(parsed.KeySignature)
                ? parsed.KeySignature
                : "C Major";

            int bpm = parsed.Bpm > 30 && parsed.Bpm < 300 ? parsed.Bpm : 120;

            // Sắp xếp các nốt theo thứ tự thời gian tăng dần
            var sortedNotes = (parsed.Notes ?? new List<PianoNoteEvent>())
                .Select((n, idx) => n with { Id = string.IsNullOrWhiteSpace(n.Id) ? $"n{idx + 1}" : n.Id })
                .OrderBy(n => n.StartTime)
                .ToList();

            var sortedChords = (parsed.Chords ?? new List<PianoChordSegment>())
                .OrderBy(c => c.StartTime)
                .ToList();

            var sortedSections = (parsed.Sections ?? new List<PianoSectionSegment>())
                .OrderBy(s => s.StartTime)
                .ToList();

            double duration = parsed.Duration > 0
                ? parsed.Duration
                : (sortedNotes.Count > 0 ? sortedNotes.Max(n => n.StartTime + n.Duration) : 0);

            return new PianoTranscriptionResult(
                Title: title,
                Artist: artist,
                KeySignature: key,
                Bpm: bpm,
                Duration: Math.Round(duration, 2),
                Sections: sortedSections,
                Chords: sortedChords,
                Notes: sortedNotes
            );
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Lỗi khi parse JSON Piano từ Gemini: {RawJson}", rawJson);
            throw new FormatException("Định dạng dữ liệu trả về từ AI không đúng cấu trúc hòa âm mong đợi.", ex);
        }
    }

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
