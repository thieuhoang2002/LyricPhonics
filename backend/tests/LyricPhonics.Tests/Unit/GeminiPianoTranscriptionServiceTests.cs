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
/// Unit tests cho GeminiPianoTranscriptionService.
/// Kiểm thử luồng xử lý trích xuất nốt nhạc Piano, hợp âm và cấu trúc từ audio stream.
/// </summary>
public class GeminiPianoTranscriptionServiceTests
{
    private readonly Mock<HttpMessageHandler> _httpHandlerMock = new(MockBehavior.Strict);
    private readonly IOptions<GeminiOptions> _options;

    public GeminiPianoTranscriptionServiceTests()
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
    public async Task TranscribePianoAsync_WithEmptyStream_ShouldThrowArgumentException()
    {
        // Arrange
        var httpClient = new HttpClient(_httpHandlerMock.Object);
        var service = new GeminiPianoTranscriptionService(
            httpClient,
            _options,
            NullLogger<GeminiPianoTranscriptionService>.Instance);

        using var emptyStream = new MemoryStream();

        // Act & Assert
        await FluentActions.Awaiting(() => service.TranscribePianoAsync(emptyStream, "audio/mp3", "test.mp3"))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*rỗng*");
    }

    [Fact]
    public async Task TranscribePianoAsync_WhenGeminiReturnsValidData_ShouldReturnStructuredResult()
    {
        // 1. Arrange AI output JSON matching PianoTranscriptionResult structure
        var mockPianoOutput = new
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
                                    title = "River Flows in You",
                                    artist = "Yiruma",
                                    bpm = 128,
                                    keySignature = "A Major",
                                    duration = 180.0,
                                    sections = new[]
                                    {
                                        new { name = "Intro", startTime = 0.0, endTime = 8.5 }
                                    },
                                    chords = new[]
                                    {
                                        new { chord = "A", startTime = 0.0, endTime = 2.0 },
                                        new { chord = "E", startTime = 2.0, endTime = 4.0 }
                                    },
                                    notes = new[]
                                    {
                                        new { id = "n1", midi = 69, noteName = "A4", startTime = 0.5, duration = 0.5, velocity = 80, hand = 0, finger = 1 },
                                        new { id = "n2", midi = 45, noteName = "A2", startTime = 0.0, duration = 2.0, velocity = 75, hand = 1, finger = 5 }
                                    }
                                })
                            }
                        }
                    }
                }
            }
        };

        var responseJson = JsonSerializer.Serialize(mockPianoOutput);

        // 2. Mock HTTP Handlers
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync((HttpRequestMessage req, CancellationToken _) =>
            {
                var uri = req.RequestUri?.ToString() ?? string.Empty;

                // Step 1: Resumable upload init
                if (uri.Contains("/upload/"))
                {
                    var initResp = new HttpResponseMessage(HttpStatusCode.OK);
                    initResp.Headers.Add("X-Goog-Upload-URL", "https://generativelanguage.googleapis.com/stream-upload-mock");
                    return initResp;
                }

                // Step 2: Resumable upload payload
                if (uri.Contains("stream-upload-mock"))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(
                            JsonSerializer.Serialize(new
                            {
                                file = new
                                {
                                    name = "files/test-piano-file-123",
                                    uri = "https://generativelanguage.googleapis.com/v1beta/files/test-piano-file-123"
                                }
                            }),
                            System.Text.Encoding.UTF8,
                            "application/json")
                    };
                }

                // Step 3: Content generation
                if (uri.Contains(":generateContent"))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(responseJson, System.Text.Encoding.UTF8, "application/json")
                    };
                }

                // Step 4: Cleanup delete
                if (req.Method == HttpMethod.Delete)
                {
                    return new HttpResponseMessage(HttpStatusCode.OK);
                }

                return new HttpResponseMessage(HttpStatusCode.NotFound);
            });

        var httpClient = new HttpClient(_httpHandlerMock.Object);
        var service = new GeminiPianoTranscriptionService(
            httpClient,
            _options,
            NullLogger<GeminiPianoTranscriptionService>.Instance);

        using var audioStream = new MemoryStream(new byte[] { 0xFF, 0xFB, 0x90, 0x44, 0x00, 0x01 });

        // Act
        var result = await service.TranscribePianoAsync(audioStream, "audio/mp3", "river_flows_in_you.mp3");

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("River Flows in You");
        result.Bpm.Should().Be(128);
        result.KeySignature.Should().Be("A Major");
        result.Notes.Should().HaveCount(2);
        result.Notes[0].NoteName.Should().Be("A2"); // sorted by StartTime
        result.Notes[0].Midi.Should().Be(45);
        result.Notes[1].NoteName.Should().Be("A4");
        result.Notes[1].Midi.Should().Be(69);
        result.Chords.Should().HaveCount(2);
        result.Sections.Should().HaveCount(1);
        result.Sections[0].Name.Should().Be("Intro");
    }
}
