using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Infrastructure.Services;

/// <summary>
/// Dịch vụ chuyển đổi Audio thành nốt Piano và Pedal bằng mô hình High-Resolution CRNN của ByteDance.
/// 
/// 💡 Kiến trúc & Hiệu năng:
/// - Chạy thông qua Microservice AI Python (FastAPI) tốc độ cao (~2 giây).
/// - Sử dụng HttpClient truyền phát trực tiếp luồng Stream (Zero-LOH, không nạp toàn bộ file vào RAM).
/// - Tự động phát hiện trạng thái offline của dịch vụ Python và cung cấp hướng dẫn khởi động thân thiện.
/// </summary>
public class ByteDancePianoTranscriptionService : IPianoTranscriptionService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ByteDancePianoTranscriptionService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public ByteDancePianoTranscriptionService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ByteDancePianoTranscriptionService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        // Thiết lập địa chỉ gốc từ cấu hình hoặc mặc định localhost:8000
        var baseUrl = _configuration["PianoService:Url"] ?? "http://localhost:8000";
        if (!baseUrl.EndsWith("/")) baseUrl += "/";
        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.Timeout = TimeSpan.FromMinutes(10);
    }

    public async Task<PianoTranscriptionResult> TranscribePianoAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Gửi tệp âm thanh tới ByteDance Piano AI Service ({FileName}, {MimeType})", fileName, mimeType);

        try
        {
            using var formData = new MultipartFormDataContent();
            using var streamContent = new StreamContent(audioStream);
            
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(
                string.IsNullOrWhiteSpace(mimeType) ? "application/octet-stream" : mimeType
            );
            
            formData.Add(streamContent, "file", fileName);

            var response = await _httpClient.PostAsync("transcribe", formData, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Lỗi từ ByteDance Piano AI Service: HTTP {StatusCode} - {ErrorBody}", response.StatusCode, errorBody);
                throw new InvalidOperationException($"ByteDance Piano AI Service trả về lỗi HTTP {(int)response.StatusCode}: {errorBody}");
            }

            await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var result = await JsonSerializer.DeserializeAsync<PianoTranscriptionResult>(responseStream, _jsonOptions, cancellationToken);

            if (result == null || result.Notes == null)
            {
                throw new InvalidOperationException("Không thể phân tích dữ liệu nốt Piano trả về từ AI Service.");
            }

            _logger.LogInformation(
                "Phân tích Piano thành công: {NoteCount} nốt, {ChordCount} hợp âm, {SectionCount} phân đoạn, Duration: {Duration:F1}s",
                result.Notes.Count,
                result.Chords.Count,
                result.Sections.Count,
                result.Duration
            );

            return result;
        }
        catch (HttpRequestException ex) when (ex.InnerException is System.Net.Sockets.SocketException)
        {
            _logger.LogError(ex, "Không thể kết nối tới ByteDance Piano AI Service tại {BaseAddress}", _httpClient.BaseAddress);
            throw new InvalidOperationException(
                "Dịch vụ Piano AI nội bộ (Python ByteDance Service) chưa được khởi động trên cổng 8000.\n" +
                "Vui lòng chạy file 'services/piano-transcription-service/run.bat' để khởi chạy mô hình AI trước khi thực hiện.",
                ex
            );
        }
    }
}
