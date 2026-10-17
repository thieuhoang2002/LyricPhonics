namespace LyricPhonics.Domain.Models;

/// <summary>
/// Chứa thông tin siêu dữ liệu (Metadata) của bài hát được phân tích.
/// 
/// 💡 Thiết kế kỹ thuật:
/// - Khai báo record với các tham số mặc định (default parameters).
/// - Dùng string? (Nullable Reference Types) để chỉ định rõ thuộc tính có thể null,
///   kết hợp tính năng 'strict nullable' trong C# 8+ để ngăn ngừa ngoại lệ NullReferenceException kinh điển.
/// </summary>
public record TranscriptionMetadata(
    string? Title = null,
    string? Artist = null,
    string? DetectedLanguage = null,
    double? Duration = null
);
