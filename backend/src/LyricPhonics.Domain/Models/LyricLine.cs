namespace LyricPhonics.Domain.Models;

/// <summary>
/// Đại diện cho một câu hát trong bài hát với cấu trúc 4 tầng:
/// 1. Lời gốc (OriginalText): Tiếng Trung, Hàn, Nhật, Anh...
/// 2. Phiên âm chuẩn quốc tế (StandardPhonetic): Pinyin, Romaji, Romaja, IPA.
/// 3. Phiên âm bồi tiếng Việt (PhoneticText): Chuẩn khẩu hình và thanh điệu để người Việt hát cover ngay.
/// 4. Dịch nghĩa tiếng Việt (TranslationText): Bản dịch ngắn gọn giúp người hát hiểu cảm xúc.
/// </summary>
public record LyricLine(
    string Id,
    double StartTime,
    double EndTime,
    string OriginalText,
    string PhoneticText,
    string? TranslationText = null,
    string? StandardPhonetic = null
)
{
    /// <summary>
    /// Tính thời lượng phát của câu hát (tính bằng giây).
    /// Expression-bodied property giúp code ngắn gọn và tối ưu.
    /// </summary>
    public double Duration => Math.Max(0, EndTime - StartTime);

    /// <summary>
    /// Kiểm tra xem một mốc thời gian (currentTime) có nằm trong khoảng phát của câu hát này không.
    /// </summary>
    public bool ContainsTime(double currentTime) =>
        currentTime >= StartTime && currentTime <= EndTime;
}
