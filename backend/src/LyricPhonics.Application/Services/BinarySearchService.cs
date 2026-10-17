using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Services;

/// <summary>
/// Triển khai thuật toán tìm kiếm nhị phân (Binary Search) O(log N) cho việc định vị câu hát.
/// 
/// 💡 Thiết kế kỹ thuật (Big-O & Data Structures):
/// - Khi bài hát phát liên tục (60 lần/giây), nếu dùng Array.Find() hoặc FirstOrDefault()
///   độ phức tạp sẽ là O(N). Với 100 câu hát và 60fps, ta tốn 6,000 phép so sánh mỗi giây!
/// - Với Binary Search O(log N), 100 câu hát chỉ cần tối đa ~7 phép so sánh (log2(100) ≈ 6.64).
/// - 10,000 câu hát cũng chỉ tốn tối đa 14 phép so sánh!
/// - Tiết kiệm CPU máy chủ và giảm giật lag trên giao diện người dùng.
/// </summary>
public class BinarySearchService : IBinarySearchService
{
    public int FindActiveLineIndex(IReadOnlyList<LyricLine> lines, double currentTime)
    {
        // Điều kiện biên: Danh sách rỗng hoặc thời gian phát âm
        if (lines == null || lines.Count == 0 || currentTime < 0)
        {
            return -1;
        }

        // Nếu thời gian phát trước câu hát đầu tiên
        if (currentTime < lines[0].StartTime)
        {
            return -1;
        }

        int low = 0;
        int high = lines.Count - 1;
        int candidateIndex = -1;

        // Vòng lặp Binary Search kinh điển O(log N)
        while (low <= high)
        {
            // Tránh tràn số nguyên (integer overflow) khi mảng quá lớn: thay vì (low + high) / 2
            int mid = low + ((high - low) / 2);
            var midLine = lines[mid];

            // Trường hợp 1: currentTime rơi trúng trong khoảng [StartTime, EndTime] của câu
            if (currentTime >= midLine.StartTime && currentTime <= midLine.EndTime)
            {
                return mid;
            }

            if (currentTime >= midLine.StartTime)
            {
                // currentTime lớn hơn StartTime của mid, câu này có thể là câu vừa phát xong
                // Lưu lại làm ứng cử viên và tiếp tục tìm về bên phải xem có câu nào khớp hơn không
                candidateIndex = mid;
                low = mid + 1;
            }
            else
            {
                // currentTime nhỏ hơn StartTime của mid, tìm kiếm ở nửa bên trái
                high = mid - 1;
            }
        }

        return candidateIndex;
    }
}
