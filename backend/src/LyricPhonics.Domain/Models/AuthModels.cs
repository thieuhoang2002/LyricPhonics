using System;

namespace LyricPhonics.Domain.Models;

/// <summary>
/// DTO chứa thông tin kết quả xác thực người dùng (JWT token, profile, song credits).
/// </summary>
public record AuthResult(
    bool Success,
    string? Token,
    string? Message,
    Guid? UserId = null,
    string? Email = null,
    int? SongCredits = null,
    bool IsAdmin = false
);

/// <summary>
/// DTO gửi lên khi đăng ký tài khoản.
/// </summary>
public record RegisterRequest(
    string Email,
    string Password,
    string ConfirmPassword,
    string? TurnstileToken = null
);

/// <summary>
/// DTO gửi lên khi đăng nhập.
/// </summary>
public record LoginRequest(
    string Email,
    string Password,
    string? TurnstileToken = null
);

/// <summary>
/// DTO trả về thông tin người dùng hiện tại (profile & credits).
/// </summary>
public record UserProfileDto(
    Guid Id,
    string Email,
    int SongCredits,
    int TotalSongsCreated,
    bool IsAdmin,
    DateTime CreatedAt
);
