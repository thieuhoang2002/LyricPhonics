namespace LyricPhonics.Domain.Models;

/// <summary>
/// Kết quả hoàn chỉnh trả về sau khi AI bóc tách bài hát thành công.
/// Bao gồm Metadata tổng quan và danh sách toàn bộ các câu hát theo mốc thời gian.
/// 
/// 💡 Thiết kế kỹ thuật:
/// - Sử dụng 'IReadOnlyList<LyricLine>' thay vì 'List<LyricLine>' để tuân thủ nguyên lý
///   đóng gói (Encapsulation) và bất biến: Client bên ngoài chỉ được đọc, không được tự ý Add/Remove
///   làm phá vỡ tính toàn vẹn của dữ liệu sau khi xử lý.
/// </summary>
public record TranscriptionResult(
    TranscriptionMetadata Metadata,
    IReadOnlyList<LyricLine> Lines
)
{
    /// <summary>
    /// Thuộc tính tiện ích đếm tổng số câu hát trong bài.
    /// </summary>
    public int TotalLines => Lines.Count;
}
