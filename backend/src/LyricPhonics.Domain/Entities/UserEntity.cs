using System;

namespace LyricPhonics.Domain.Entities;

/// <summary>
/// Đại diện cho tài khoản người dùng trong hệ thống LyricPhonics.
/// Quản lý thông tin đăng nhập, địa chỉ IP chống spam tài khoản, và số lượt tạo/lưu bài hát.
/// </summary>
public class UserEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string RegistrationIp { get; set; } = string.Empty;

    /// <summary>
    /// Số lượt tạo và lưu bài hát còn lại (mặc định tặng 2 bài khi đăng ký).
    /// </summary>
    public int SongCredits { get; set; } = 2;

    public int TotalSongsCreated { get; set; } = 0;

    public bool IsAdmin { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginAt { get; set; }
}
