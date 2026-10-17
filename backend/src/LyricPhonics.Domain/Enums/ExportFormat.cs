namespace LyricPhonics.Domain.Enums;

/// <summary>
/// Các định dạng xuất tệp được hỗ trợ bởi hệ thống LyricPhonics.
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN:
/// - Enum định kiểu mạnh (Strongly-typed), giúp loại bỏ hoàn toàn các chuỗi 'magic strings' ("txt", "lrc").
/// - Hạn chế lỗi typo khi truyền tham số giữa các tầng kiến trúc.
/// </summary>
public enum ExportFormat
{
    /// <summary>
    /// File văn bản thuần .TXT có căn chỉnh 3 tầng rõ ràng.
    /// </summary>
    Txt,

    /// <summary>
    /// File chuẩn Karaoke .LRC với các mốc thời gian [mm:ss.xx].
    /// </summary>
    Lrc,

    /// <summary>
    /// File phụ đề chuẩn .SRT tương thích CapCut và Premiere.
    /// </summary>
    Srt,

    /// <summary>
    /// Xuất định dạng JSON có cấu trúc.
    /// </summary>
    Json,

    /// <summary>
    /// Văn bản sao chép trực tiếp vào bộ nhớ tạm (Clipboard).
    /// </summary>
    Clipboard
}
