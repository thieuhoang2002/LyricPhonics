using System;
using System.Threading;
using System.Threading.Tasks;
using LyricPhonics.Domain.Entities;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện xử lý đăng ký, đăng nhập và phát hành JWT Token cho LyricPhonics.
/// </summary>
public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, string clientIp, CancellationToken cancellationToken = default);
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<UserEntity?> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    string GenerateJwtToken(UserEntity user);
    Guid? ValidateToken(string authHeader);
}
