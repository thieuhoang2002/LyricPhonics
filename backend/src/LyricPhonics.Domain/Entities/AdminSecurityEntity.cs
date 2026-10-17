using System;

namespace LyricPhonics.Domain.Entities;

/// <summary>
/// Đại diện cho bản ghi bảo mật 2 lớp cấp quân sự (Web Crypto PBKDF2 + AES-256-GCM).
/// Server chỉ lưu trữ ciphertext, salt, iv, tag và gợi ý (hint).
/// Tuyệt đối không bao giờ lưu trữ mật khẩu gốc hay master key.
/// </summary>
public class AdminSecurityEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Ciphertext { get; set; } = string.Empty;

    public string Salt { get; set; } = string.Empty;

    public string Iv { get; set; } = string.Empty;

    public string Tag { get; set; } = string.Empty;

    public string Hint { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
