using FluentAssertions;
using LyricPhonics.Application.Services;
using LyricPhonics.Domain.Models;
using Xunit;

namespace LyricPhonics.Tests.Unit;

/// <summary>
/// Bộ kiểm thử xUnit cho dịch vụ chuyển đổi và phân tích file Karaoke LRC.
/// </summary>
public class LrcServiceTests
{
    private readonly LrcService _sut = new();

    [Fact]
    public void GenerateLrc_ShouldContainMetadataAndStandardTimestamps()
    {
        var metadata = new TranscriptionMetadata("Test Song", "Test Artist", "Chinese");
        var lines = new List<LyricLine>
        {
            new("1", 1.5, 4.0, "Ni hao", "Nỉ hảo", "Xin chào"),
            new("2", 6.25, 9.8, "Xie xie", "Tạ tạ", "Cảm ơn")
        };
        var result = new TranscriptionResult(metadata, lines);

        string lrc = _sut.GenerateLrc(result);

        lrc.Should().Contain("[ti:Test Song]");
        lrc.Should().Contain("[ar:Test Artist]");
        lrc.Should().Contain("[00:01.50]Ni hao (Nỉ hảo)");
        lrc.Should().Contain("[00:06.25]Xie xie (Tạ tạ)");
    }

    [Fact]
    public void ParseLrc_ShouldParseTimestampsAndTextsAccurately()
    {
        string lrcContent = @"
[ti:Sample Track]
[ar:Sample Singer]
[00:02.30]Ni hao ma (Nỉ hảo ma)
[00:07.50]Wo hen hao (Ủa hẩn hảo)
";

        var lines = _sut.ParseLrc(lrcContent);

        lines.Should().HaveCount(2);
        lines[0].StartTime.Should().BeApproximately(2.30, 0.01);
        lines[0].OriginalText.Should().Be("Ni hao ma");
        lines[0].PhoneticText.Should().Be("Nỉ hảo ma");

        lines[1].StartTime.Should().BeApproximately(7.50, 0.01);
        lines[1].OriginalText.Should().Be("Wo hen hao");
        lines[1].PhoneticText.Should().Be("Ủa hẩn hảo");
    }

    [Theory]
    [InlineData(0.0, "[00:00.00]")]
    [InlineData(65.45, "[01:05.45]")]
    [InlineData(125.08, "[02:05.08]")]
    public void FormatSecondsToLrc_ShouldFormatStandardLrcTag(double seconds, string expectedTag)
    {
        string tag = LrcService.FormatSecondsToLrc(seconds);
        tag.Should().Be(expectedTag);
    }
}
