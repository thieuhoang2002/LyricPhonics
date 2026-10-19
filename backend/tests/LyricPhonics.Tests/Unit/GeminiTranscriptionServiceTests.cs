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
/// 💡 Thiết kế kỹ thuật (Testing HttpClient with Moq):
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

        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync((HttpRequestMessage req, CancellationToken _) =>
            {
                string uri = req.RequestUri?.ToString() ?? string.Empty;

                // 1. Phản hồi khởi tạo Resumable Upload Session
                if (uri.Contains("/upload/"))
                {
                    var initResp = new HttpResponseMessage(HttpStatusCode.OK);
                    initResp.Headers.Add("X-Goog-Upload-URL", "https://generativelanguage.googleapis.com/upload-mock-endpoint");
                    return initResp;
                }

                // 2. Phản hồi tải luồng dữ liệu Stream trực tiếp lên Gemini File API
                if (uri.Contains("upload-mock-endpoint"))
                {
                    var uploadSuccess = new
                    {
                        file = new
                        {
                            name = "files/mock-test-file-123",
                            uri = "https://generativelanguage.googleapis.com/v1beta/files/mock-test-file-123"
                        }
                    };
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(uploadSuccess))
                    };
                }

                // 3. Phản hồi dọn dẹp file tạm
                if (req.Method == HttpMethod.Delete)
                {
                    return new HttpResponseMessage(HttpStatusCode.OK);
                }

                // 4. Phản hồi bóc tách lời bài hát từ generateContent
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(mockAiOutput))
                };
            });

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

    [Fact]
    public async Task TranscribeAudioAsync_WhenFileApiUnavailable_ShouldFallbackToInlineDataSuccessfully()
    {
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
                                        title = "Fallback Song",
                                        artist = "Fallback Artist",
                                        detectedLanguage = "en"
                                    },
                                    lines = new[]
                                    {
                                        new
                                        {
                                            startTime = 0.5,
                                            endTime = 2.0,
                                            originalText = "Fallback line",
                                            phoneticText = "Phô-bách lai",
                                            translationText = "Dòng dự phòng"
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            }
        };

        var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync((HttpRequestMessage req, CancellationToken _) =>
            {
                // Giả lập File API trả về lỗi 503 để kích hoạt fallback sang inlineData
                if (req.RequestUri != null && req.RequestUri.ToString().Contains("/upload/"))
                {
                    return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
                }

                // Call generateContent thành công
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(mockAiOutput))
                };
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var sut = new GeminiTranscriptionService(httpClient, _options, NullLogger<GeminiTranscriptionService>.Instance);

        using var testStream = new MemoryStream(new byte[] { 0xAA, 0xBB, 0xCC });

        var result = await sut.TranscribeAudioAsync(testStream, "audio/mpeg", "fallback.mp3");

        result.Should().NotBeNull();
        result.Metadata.Title.Should().Be("Fallback Song");
        result.Lines.Should().HaveCount(1);
        result.Lines[0].OriginalText.Should().Be("Fallback line");
    }
}
