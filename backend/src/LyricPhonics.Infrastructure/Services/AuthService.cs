using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Entities;
using LyricPhonics.Domain.Models;
using LyricPhonics.Infrastructure.Security;

namespace LyricPhonics.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ITurnstileService _turnstileService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        ITurnstileService turnstileService,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _turnstileService = turnstileService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResult> RegisterAsync(
        RegisterRequest request,
        string clientIp,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return new AuthResult(false, null, "Email và mật khẩu không được để trống.");
        }

        if (request.Password.Length < 6)
        {
            return new AuthResult(false, null, "Mật khẩu phải chứa ít nhất 6 ký tự.");
        }

        if (request.Password != request.ConfirmPassword)
        {
            return new AuthResult(false, null, "Mật khẩu nhập lại không trùng khớp.");
        }

        // 1. Kiểm tra Cloudflare Turnstile bot protection
        bool isHuman = await _turnstileService.VerifyTokenAsync(request.TurnstileToken, clientIp, cancellationToken);
        if (!isHuman)
        {
            return new AuthResult(false, null, "Xác thực chống bot thất bại. Vui lòng thử lại.");
        }

        // 2. Kiểm tra giới hạn tối đa 3 tài khoản trên 1 IP (Anti-Abuse IP Guard)
        int ipAccountCount = await _userRepository.CountByIpAsync(clientIp, cancellationToken);
        if (ipAccountCount >= 3)
        {
            _logger.LogWarning("IP {Ip} đã tạo {Count} tài khoản, từ chối tạo mới.", clientIp, ipAccountCount);
            return new AuthResult(false, null, "Địa chỉ IP của bạn đã tạo tối đa 3 tài khoản. Vui lòng đăng nhập vào tài khoản đã tạo.");
        }

        // 3. Kiểm tra email đã tồn tại
        var existing = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existing != null)
        {
            return new AuthResult(false, null, "Email này đã được đăng ký trong hệ thống.");
        }

        // 4. Tạo tài khoản mới với 2 lượt miễn phí ban đầu
        string passwordHash = PasswordHasher.HashPassword(request.Password);
        var newUser = new UserEntity
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
            RegistrationIp = clientIp,
            SongCredits = 2,
            TotalSongsCreated = 0,
            IsAdmin = false,
            CreatedAt = DateTime.UtcNow
        };

        var savedUser = await _userRepository.CreateUserAsync(newUser, cancellationToken);
        string token = GenerateJwtToken(savedUser);

        _logger.LogInformation("Người dùng mới đăng ký thành công: {Email} (IP: {Ip})", savedUser.Email, clientIp);

        return new AuthResult(
            Success: true,
            Token: token,
            Message: "Đăng ký thành công! Bạn nhận được 2 lượt tạo bài hát miễn phí.",
            UserId: savedUser.Id,
            Email: savedUser.Email,
            SongCredits: savedUser.SongCredits,
            IsAdmin: savedUser.IsAdmin
        );
    }

    public async Task<AuthResult> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return new AuthResult(false, null, "Email và mật khẩu không được để trống.");
        }

        var user = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user == null)
        {
            return new AuthResult(false, null, "Email hoặc mật khẩu không chính xác.");
        }

        bool isPasswordValid = PasswordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return new AuthResult(false, null, "Email hoặc mật khẩu không chính xác.");
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _userRepository.UpdateUserAsync(user, cancellationToken);

        string token = GenerateJwtToken(user);

        return new AuthResult(
            Success: true,
            Token: token,
            Message: "Đăng nhập thành công.",
            UserId: user.Id,
            Email: user.Email,
            SongCredits: user.SongCredits,
            IsAdmin: user.IsAdmin
        );
    }

    public async Task<UserEntity?> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _userRepository.GetByIdAsync(userId, cancellationToken);
    }

    public string GenerateJwtToken(UserEntity user)
    {
        string secret = _configuration["Jwt:Secret"] ?? "LyricPhonics_Default_Fallback_Secret_Key_32bytes_Long!";
        string issuer = _configuration["Jwt:Issuer"] ?? "LyricPhonics";
        string audience = _configuration["Jwt:Audience"] ?? "LyricPhonicsAudience";
        int expiryDays = int.TryParse(_configuration["Jwt:ExpiryDays"], out int days) ? days : 30;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("credits", user.SongCredits.ToString()),
            new Claim("isAdmin", user.IsAdmin.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expiryDays),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public Guid? ValidateToken(string authHeader)
    {
        if (string.IsNullOrWhiteSpace(authHeader)) return null;

        string token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader.Substring(7).Trim()
            : authHeader.Trim();

        string secret = _configuration["Jwt:Secret"] ?? "LyricPhonics_Default_Fallback_Secret_Key_32bytes_Long!";
        string issuer = _configuration["Jwt:Issuer"] ?? "LyricPhonics";
        string audience = _configuration["Jwt:Audience"] ?? "LyricPhonicsAudience";

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier) ?? principal.FindFirst("sub");
            if (subClaim != null && Guid.TryParse(subClaim.Value, out Guid userId))
            {
                return userId;
            }
            return null;
        }
        catch
        {
            return null;
        }
    }
}
