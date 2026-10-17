using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện định nghĩa thuật toán tìm kiếm câu hát theo thời gian thực với độ phức tạp tối ưu O(log N).
/// </summary>
public interface IBinarySearchService
{
    /// <summary>
    /// Tìm vị trí index của câu hát đang phát tại mốc thời gian currentTime.
    /// </summary>
    /// <param name="lines">Danh sách các câu hát đã sắp xếp theo StartTime.</param>
    /// <param name="currentTime">Mốc thời gian hiện tại của bài hát (tính bằng giây).</param>
    /// <returns>Index của câu hát nếu đang trong khoảng [StartTime, EndTime], hoặc index gần nhất, hoặc -1 nếu trước câu đầu tiên.</returns>
    int FindActiveLineIndex(IReadOnlyList<LyricLine> lines, double currentTime);
}
