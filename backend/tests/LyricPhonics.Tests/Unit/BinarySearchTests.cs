using FluentAssertions;
using LyricPhonics.Application.Services;
using LyricPhonics.Domain.Models;
using Xunit;

namespace LyricPhonics.Tests.Unit;

/// <summary>
/// Bộ kiểm thử Unit Test cho thuật toán Binary Search O(log N).
/// Sử dụng xUnit và FluentAssertions để viết assertion tự nhiên và dễ đọc.
/// </summary>
public class BinarySearchTests
{
    private readonly BinarySearchService _sut = new();

    private static readonly List<LyricLine> SampleLines = new()
    {
        new("1", 1.0, 4.0, "Line 1 Original", "Line 1 Phonics"),
        new("2", 5.0, 8.0, "Line 2 Original", "Line 2 Phonics"),
        new("3", 9.0, 12.0, "Line 3 Original", "Line 3 Phonics"),
        new("4", 13.0, 16.0, "Line 4 Original", "Line 4 Phonics"),
        new("5", 17.0, 20.0, "Line 5 Original", "Line 5 Phonics"),
    };

    [Fact]
    public void FindActiveLineIndex_WhenLinesEmpty_ShouldReturnMinusOne()
    {
        var result = _sut.FindActiveLineIndex(Array.Empty<LyricLine>(), 5.0);
        result.Should().Be(-1);
    }

    [Fact]
    public void FindActiveLineIndex_WhenCurrentTimeNegative_ShouldReturnMinusOne()
    {
        var result = _sut.FindActiveLineIndex(SampleLines, -1.5);
        result.Should().Be(-1);
    }

    [Fact]
    public void FindActiveLineIndex_WhenTimeBeforeFirstLine_ShouldReturnMinusOne()
    {
        var result = _sut.FindActiveLineIndex(SampleLines, 0.5);
        result.Should().Be(-1);
    }

    [Theory]
    [InlineData(1.0, 0)]   // Bắt đầu câu 1
    [InlineData(2.5, 0)]   // Giữa câu 1
    [InlineData(4.0, 0)]   // Kết thúc câu 1
    [InlineData(5.0, 1)]   // Bắt đầu câu 2
    [InlineData(10.0, 2)]  // Giữa câu 3
    [InlineData(19.0, 4)]  // Giữa câu 5
    public void FindActiveLineIndex_WhenTimeInsideLine_ShouldReturnCorrectIndex(double currentTime, int expectedIndex)
    {
        var result = _sut.FindActiveLineIndex(SampleLines, currentTime);
        result.Should().Be(expectedIndex);
    }

    [Fact]
    public void FindActiveLineIndex_WhenInGapBetweenLines_ShouldReturnPreviousLineIndex()
    {
        // Giữa câu 1 (kết thúc ở 4.0) và câu 2 (bắt đầu ở 5.0), tại 4.5s
        var result = _sut.FindActiveLineIndex(SampleLines, 4.5);
        result.Should().Be(0);
    }

    [Fact]
    public void FindActiveLineIndex_WhenTimeAfterAllLines_ShouldReturnLastLineIndex()
    {
        var result = _sut.FindActiveLineIndex(SampleLines, 30.0);
        result.Should().Be(4);
    }

    [Fact]
    public void FindActiveLineIndex_PerformanceWithTenThousandLines_ShouldExecuteUnderTwentyMilliseconds()
    {
        // 💡 KIẾN THỨC C# / PHỎNG VẤN (Big-O Benchmark Test):
        // Chứng minh thuật toán Binary Search O(log N) xử lý 10,000 phần tử trong nháy mắt.
        var largeLines = new List<LyricLine>(10000);
        for (int i = 0; i < 10000; i++)
        {
            largeLines.Add(new LyricLine(
                Id: i.ToString(),
                StartTime: i * 3.0,
                EndTime: (i * 3.0) + 2.5,
                OriginalText: $"Line {i}",
                PhoneticText: $"Phonics {i}"
            ));
        }

        var sw = System.Diagnostics.Stopwatch.StartNew();

        for (int q = 0; q < 5000; q++)
        {
            _sut.FindActiveLineIndex(largeLines, q * 2.5);
        }

        sw.Stop();

        // 5,000 lượt tra cứu trên danh sách 10,000 câu phải hoàn thành dưới 50ms
        sw.ElapsedMilliseconds.Should().BeLessThan(50);
    }
}
