using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện xử lý chuyển đổi và đọc hiểu định dạng Karaoke LRC tiêu chuẩn.
/// </summary>
public interface ILrcService
{
    /// <summary>
    /// Tạo nội dung file .LRC từ kết quả phiên âm bao gồm thẻ metadata và mốc thời gian [mm:ss.xx].
    /// </summary>
    string GenerateLrc(TranscriptionResult result);

    /// <summary>
    /// Phân tích cú pháp (Parse) từ chuỗi file .LRC thành danh sách các đối tượng LyricLine.
    /// </summary>
    IReadOnlyList<LyricLine> ParseLrc(string lrcContent);
}
