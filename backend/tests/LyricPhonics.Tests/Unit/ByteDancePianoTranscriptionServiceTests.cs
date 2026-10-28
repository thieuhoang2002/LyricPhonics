using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Xunit;
using LyricPhonics.Domain.Models;
using LyricPhonics.Infrastructure.Services;

namespace LyricPhonics.Tests.Unit;

public class ByteDancePianoTranscriptionServiceTests
{
    private readonly Mock<ILogger<ByteDancePianoTranscriptionService>> _loggerMock;
    private readonly IConfiguration _configuration;

    public ByteDancePianoTranscriptionServiceTests()
    {
        _loggerMock = new Mock<ILogger<ByteDancePianoTranscriptionService>>();
        
        var inMemorySettings = new System.Collections.Generic.Dictionary<string, string?>
        {
            {"PianoService:Url", "http://localhost:8000"}
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public async Task TranscribePianoAsync_WhenServiceReturnsSuccess_ReturnsValidTranscriptionResult()
    {
        // Arrange
        var mockJson = """
        {
            "title": "dedanhchoem",
            "artist": "ByteDance AI Piano Cover",
            "keySignature": "C Major",
            "bpm": 120,
            "duration": 15.5,
            "sections": [
                { "name": "Intro", "startTime": 0.0, "endTime": 5.0 },
                { "name": "Theme", "startTime": 5.0, "endTime": 15.5 }
            ],
            "chords": [
                { "chord": "C", "startTime": 0.0, "endTime": 2.0 },
                { "chord": "Am", "startTime": 2.0, "endTime": 4.0 }
            ],
            "notes": [
                { "id": "n1", "midi": 60, "noteName": "C4", "startTime": 0.5, "duration": 1.0, "velocity": 85, "hand": 0, "finger": 0 },
                { "id": "n2", "midi": 48, "noteName": "C3", "startTime": 0.5, "duration": 2.0, "velocity": 90, "hand": 1, "finger": 0 }
            ]
        }
        """;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(mockJson, Encoding.UTF8, "application/json")
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var service = new ByteDancePianoTranscriptionService(httpClient, _configuration, _loggerMock.Object);

        using var testStream = new MemoryStream(new byte[] { 0x52, 0x49, 0x46, 0x46 }); // Dummy WAV

        // Act
        var result = await service.TranscribePianoAsync(testStream, "audio/wav", "test.wav");

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("dedanhchoem");
        result.Bpm.Should().Be(120);
        result.Duration.Should().Be(15.5);
        result.Notes.Should().HaveCount(2);
        result.Notes[0].NoteName.Should().Be("C4");
        result.Notes[0].Velocity.Should().Be(85);
        result.Chords.Should().HaveCount(2);
        result.Sections.Should().HaveCount(2);
    }

    [Fact]
    public async Task TranscribePianoAsync_WhenServiceReturns500_ThrowsInvalidOperationException()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.InternalServerError,
                Content = new StringContent("Model inference failed", Encoding.UTF8, "text/plain")
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var service = new ByteDancePianoTranscriptionService(httpClient, _configuration, _loggerMock.Object);

        using var testStream = new MemoryStream(new byte[] { 1, 2, 3 });

        // Act & Assert
        var act = async () => await service.TranscribePianoAsync(testStream, "audio/wav", "test.wav");
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*HTTP 500*");
    }

    [Fact]
    public async Task TranscribePianoAsync_WhenServiceConnectionFails_ThrowsHelpfulInstructionException()
    {
        // Arrange
        var socketException = new System.Net.Sockets.SocketException((int)System.Net.Sockets.SocketError.ConnectionRefused);
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ThrowsAsync(new HttpRequestException("Connection refused", socketException));

        var httpClient = new HttpClient(handlerMock.Object);
        var service = new ByteDancePianoTranscriptionService(httpClient, _configuration, _loggerMock.Object);

        using var testStream = new MemoryStream(new byte[] { 1, 2, 3 });

        // Act & Assert
        var act = async () => await service.TranscribePianoAsync(testStream, "audio/wav", "test.wav");
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*run.bat*");
    }
}
