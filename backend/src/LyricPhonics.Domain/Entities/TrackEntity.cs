namespace LyricPhonics.Domain.Entities;

/// <summary>
/// Đại diện cho bản ghi bài hát được lưu trữ trong cơ sở dữ liệu PostgreSQL (Neon DB).
/// 
/// 💡 Thiết kế kỹ thuật:
/// - 'LinesJson' được lưu trữ dưới định dạng 'jsonb' trong PostgreSQL.
///   Cho phép truy vấn và lập chỉ mục (GIN index) cực nhanh mà không cần tạo bảng con rườm rà.
/// </summary>
public class TrackEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = "Unknown Artist";
    public string FileName { get; set; } = string.Empty;
    public string DetectedLanguage { get; set; } = "auto";
    public string TargetLanguage { get; set; } = "vi";
    public double Duration { get; set; }
    
    /// <summary>
    /// ID người dùng sở hữu bài hát (nếu đã đăng nhập)
    /// </summary>
    public Guid? UserId { get; set; }

    /// <summary>
    /// Chuỗi JSON của mảng LyricLine (được lưu dưới dạng cột jsonb trong Postgres)
    /// </summary>
    public string LinesJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
