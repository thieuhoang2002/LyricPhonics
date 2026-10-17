using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using LyricPhonics.Domain.Models;
using LyricPhonics.Infrastructure.Gemini;
using Moq;
using Moq.Protected;
using Xunit;

namespace LyricPhonics.Tests.Unit;

/// <summary>
/// Bộ kiểm thử Unit Test cho GeminiTranscriptionService sử dụng Mock HttpMessageHandler.
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (Testing HttpClient with Moq):
/// - Không thể mock trực tiếp class HttpClient vì các phương thức SendAsync không phải virtual.
/// - Kỹ thuật chuẩn là mock 'HttpMessageHandler' thông qua Moq 'Protected()' API để giả lập
///   phản hồi HTTP từ máy chủ Google Gemini.
/// </summary>
public class GeminiTranscriptionServiceTests
{
    private readonly Mock<HttpMessageHandler> _httpHandlerMock = new(MockBehavior.Strict);
    private readonly IOptions<GeminiOptions> _options;

    public GeminiTranscriptionServiceTests()
    {
        _options = Options.Create(new GeminiOptions
        {
            ApiKey = "test-api-key",
            Model = "gemini-3.5-flash",
            FallbackModel = "gemini-3.8-flash",
            BaseUrl = "https://generativelanguage.googleapis.com/v1beta"
        });
    }

    [Fact]
    public async Task TranscribeAudioAsync_WhenGeminiReturnsValidJson_ShouldReturnStructuredResult()
    {
        // 1. Dữ liệu giả lập mà Gemini trả về
        var mockAiOutput = new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new[]
                        {
                            new
                            {
                                text = JsonSerializer.Serialize(new
                                {
                                    metadata = new
                                    {
                                        title = "Synthetic Song",
                                        artist = "Synthetic Singer",
                                        detectedLanguage = "zh"
                                    },
                                    lines = new[]
                                    {
                                        new
                                        {
                                            startTime = 1.0,
                                            endTime = 4.0,
                                            originalText = "Alpha original phrase one",
                                            phoneticText = "An-pha o-ri-gi-nal phờ-rây-sơ oan",
                                            translationText = "Câu thử nghiệm một"
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            }
        };

        var httpResponse = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(JsonSerializer.Serialize(mockAiOutput))
        };

        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(httpResponse);

        var httpClient = new HttpClient(_httpHandlerMock.Object);
        var sut = new GeminiTranscriptionService(httpClient, _options, NullLogger<GeminiTranscriptionService>.Instance);

        using var testStream = new MemoryStream(new byte[] { 0x01, 0x02, 0x03, 0x04 });

        // 2. Thực thi
        var result = await sut.TranscribeAudioAsync(testStream, "audio/mpeg", "test_song.mp3");

        // 3. Khẳng định (Assert)
        result.Should().NotBeNull();
        result.Metadata.Title.Should().Be("Synthetic Song");
        result.Metadata.Artist.Should().Be("Synthetic Singer");
        result.Lines.Should().HaveCount(1);
        result.Lines[0].OriginalText.Should().Be("Alpha original phrase one");
        result.Lines[0].PhoneticText.Should().Be("An-pha o-ri-gi-nal phờ-rây-sơ oan");
    }

    [Fact]
    public async Task TranscribeAudioAsync_WhenStreamEmpty_ShouldThrowArgumentException()
    {
        var httpClient = new HttpClient(_httpHandlerMock.Object);
        var sut = new GeminiTranscriptionService(httpClient, _options, NullLogger<GeminiTranscriptionService>.Instance);

        using var emptyStream = new MemoryStream();

        var act = async () => await sut.TranscribeAudioAsync(emptyStream, "audio/mpeg", "empty.mp3");

        await act.Should().ThrowAsync<ArgumentException>();
    }
}
