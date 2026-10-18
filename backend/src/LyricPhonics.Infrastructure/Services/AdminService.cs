using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Entities;
using LyricPhonics.Domain.Models;
using LyricPhonics.Infrastructure.Persistence;
using LyricPhonics.Infrastructure.Security;

namespace LyricPhonics.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly LyricPhonicsDbContext _dbContext;
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        LyricPhonicsDbContext dbContext,
        IUserRepository userRepository,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<AdminService> logger)
    {
        _dbContext = dbContext;
        _userRepository = userRepository;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private string GetAdminEmail()
    {
        string? email = Environment.GetEnvironmentVariable("ADMIN_EMAIL");
        if (string.IsNullOrWhiteSpace(email)) email = _configuration["Admin:Email"];
        if (string.IsNullOrWhiteSpace(email)) email = _configuration["AdminConfig:Email"];
        if (string.IsNullOrWhiteSpace(email)) email = "admin@example.com";
        return email.Trim();
    }

    private string GetAdminPassword()
    {
        string? pass = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");
        if (string.IsNullOrWhiteSpace(pass)) pass = _configuration["Admin:Password"];
        if (string.IsNullOrWhiteSpace(pass)) pass = _configuration["AdminConfig:Password"];
        if (string.IsNullOrWhiteSpace(pass)) pass = "AdminSecurePass_ChangeMe_2026!";
        return pass.Trim();
    }

    private string GetMasterPassphrase()
    {
        string? pass = Environment.GetEnvironmentVariable("ADMIN_MASTER_PASSPHRASE");
        if (string.IsNullOrWhiteSpace(pass)) pass = _configuration["Admin:MasterPassphrase"];
        if (string.IsNullOrWhiteSpace(pass)) pass = _configuration["AdminConfig:MasterPassphrase"];
        if (string.IsNullOrWhiteSpace(pass)) pass = "DEFAULT_MASTER_KEY_2026";
        return pass.Trim();
    }

    private string GetMasterHint()
    {
        string? hint = Environment.GetEnvironmentVariable("ADMIN_PASSPHRASE_HINT");
        if (string.IsNullOrWhiteSpace(hint)) hint = _configuration["Admin:MasterHint"];
        if (string.IsNullOrWhiteSpace(hint)) hint = _configuration["AdminConfig:PassphraseHint"];
        if (string.IsNullOrWhiteSpace(hint)) hint = "Default Master Passphrase (Configurable via ADMIN_PASSPHRASE_HINT)";
        return hint.Trim();
    }

    public async Task<AdminLayer1Result> LoginLayer1Async(AdminLayer1Request request, CancellationToken cancellationToken = default)
    {
        string expectedEmail = GetAdminEmail();
        string expectedPassword = GetAdminPassword();

        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return new AdminLayer1Result(false, null, null, "Email và mật khẩu không được để trống.");
        }

        if (!string.Equals(request.Email.Trim(), expectedEmail, StringComparison.OrdinalIgnoreCase) ||
            request.Password.Trim() != expectedPassword)
        {
            return new AdminLayer1Result(false, null, null, "Mật khẩu Admin Lớp 1 không chính xác.");
        }

        // Lấy hoặc khởi tạo cấu hình Lớp 2 (Web Crypto) nếu chưa có
        AdminSecurityEntity? security = null;
        try
        {
            security = await _dbContext.AdminSecurities.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Bảng admin_securities chưa tồn tại hoặc bị lỗi. Đang tự động tạo bảng...");
            try
            {
                await _dbContext.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS admin_securities (
    ""Id"" UUID PRIMARY KEY,
    ""Ciphertext"" TEXT NOT NULL,
    ""Salt"" TEXT NOT NULL,
    ""Iv"" TEXT NOT NULL,
    ""Tag"" TEXT NOT NULL,
    ""Hint"" VARCHAR(500),
    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);", cancellationToken);
                security = await _dbContext.AdminSecurities.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync(cancellationToken);
            }
            catch (Exception createEx)
            {
                _logger.LogError(createEx, "Không thể tạo bảng admin_securities.");
            }
        }

        string defaultPassphrase = GetMasterPassphrase();
        string defaultHint = GetMasterHint();

        if (security == null)
        {
            var package = MilitaryWebCrypto.Encrypt("LYRIC_PHONICS_SUPER_ADMIN_VERIFIED", defaultPassphrase, defaultHint);
            security = new AdminSecurityEntity
            {
                Ciphertext = package.Ciphertext,
                Salt = package.Salt,
                Iv = package.Iv,
                Tag = package.Tag,
                Hint = package.Hint,
                UpdatedAt = DateTime.UtcNow
            };
            try
            {
                await _dbContext.AdminSecurities.AddAsync(security, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception saveEx)
            {
                _logger.LogWarning(saveEx, "Không thể lưu admin_security vào DB. Dùng in-memory fallback.");
            }
        }

        // Tạo Challenge Token tạm thời (có hạn 10 phút) để người dùng nhập Lớp 2
        string challengeToken = GenerateChallengeToken(expectedEmail);

        return new AdminLayer1Result(
            Success: true,
            ChallengeToken: challengeToken,
            Hint: security.Hint,
            Message: "Xác thực Lớp 1 thành công! Vui lòng nhập Master Passphrase Lớp 2."
        );
    }

    public async Task<AdminLayer2Result> VerifyLayer2Async(AdminLayer2Request request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ChallengeToken) || string.IsNullOrWhiteSpace(request.MasterPassphrase))
        {
            return new AdminLayer2Result(false, null, "Challenge token và Master Passphrase không được để trống.");
        }

        if (!ValidateChallengeToken(request.ChallengeToken, out string? adminEmail))
        {
            return new AdminLayer2Result(false, null, "Challenge token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại Lớp 1.");
        }

        AdminSecurityEntity? security = null;
        try
        {
            security = await _dbContext.AdminSecurities.OrderByDescending(s => s.UpdatedAt).FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể đọc admin_securities trong Lớp 2. Dùng fallback.");
        }

        string masterPass = GetMasterPassphrase();
        if (security == null)
        {
            var fallbackPkg = MilitaryWebCrypto.Encrypt("LYRIC_PHONICS_SUPER_ADMIN_VERIFIED", masterPass, GetMasterHint());
            security = new AdminSecurityEntity
            {
                Ciphertext = fallbackPkg.Ciphertext,
                Salt = fallbackPkg.Salt,
                Iv = fallbackPkg.Iv,
                Tag = fallbackPkg.Tag,
                Hint = fallbackPkg.Hint,
                UpdatedAt = DateTime.UtcNow
            };
        }

        var package = new MilitaryWebCrypto.EncryptedPackage(
            Ciphertext: security.Ciphertext,
            Salt: security.Salt,
            Iv: security.Iv,
            Tag: security.Tag,
            Hint: security.Hint
        );

        string? decrypted = MilitaryWebCrypto.Decrypt(package, request.MasterPassphrase.Trim());
        bool isValid = decrypted == "LYRIC_PHONICS_SUPER_ADMIN_VERIFIED" || request.MasterPassphrase.Trim() == masterPass;
        if (!isValid)
        {
            _logger.LogWarning("Admin Lớp 2 xác thực thất bại: Master Passphrase không đúng hoặc Authentication Tag bị sai.");
            return new AdminLayer2Result(false, null, "Master Passphrase không chính xác! Không thể giải mã Authentication Tag cấp quân sự.");
        }

        // Tự động đồng bộ lại ciphertext nếu trước đó chưa khớp
        if (decrypted != "LYRIC_PHONICS_SUPER_ADMIN_VERIFIED" && request.MasterPassphrase.Trim() == masterPass)
        {
            var reEncrypted = MilitaryWebCrypto.Encrypt("LYRIC_PHONICS_SUPER_ADMIN_VERIFIED", masterPass, security.Hint);
            security.Ciphertext = reEncrypted.Ciphertext;
            security.Salt = reEncrypted.Salt;
            security.Iv = reEncrypted.Iv;
            security.Tag = reEncrypted.Tag;
            security.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // Tạo JWT Token đặc quyền Admin có hạn 24 giờ
        string adminToken = GenerateAdminJwtToken(adminEmail!);

        _logger.LogInformation("Admin đã xác thực thành công cả 2 lớp bảo mật vào Vũ trụ Quản trị!");

        return new AdminLayer2Result(
            Success: true,
            AdminToken: adminToken,
            Message: "Xác thực 2 lớp cấp quân sự thành công! Chào mừng đến với Vũ trụ Quản trị."
        );
    }

    public async Task<List<UserEntity>> GetUsersAsync(string? search = null, CancellationToken cancellationToken = default)
    {
        // 1. Tự động đồng bộ tài khoản SuperAdmin vào bảng Users nếu chưa có
        string adminEmail = GetAdminEmail();
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            try
            {
                var existingAdmin = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == adminEmail.ToLower(), cancellationToken);
                if (existingAdmin == null)
                {
                    int songCount = 0;
                    try { songCount = await _dbContext.Tracks.CountAsync(cancellationToken); } catch { }

                    var adminUser = new UserEntity
                    {
                        Id = Guid.NewGuid(),
                        Email = adminEmail.ToLower(),
                        PasswordHash = "MILITARY_2LAYER_PROTECTED",
                        RegistrationIp = "System SuperAdmin",
                        SongCredits = 999999, // Vô hạn lượt cho Admin
                        TotalSongsCreated = songCount,
                        IsAdmin = true,
                        CreatedAt = DateTime.UtcNow,
                        LastLoginAt = DateTime.UtcNow
                    };
                    await _dbContext.Users.AddAsync(adminUser, cancellationToken);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
                else if (!existingAdmin.IsAdmin || existingAdmin.SongCredits < 1000)
                {
                    existingAdmin.IsAdmin = true;
                    existingAdmin.SongCredits = 999999;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể tự động đồng bộ tài khoản SuperAdmin vào bảng Users.");
            }
        }

        return await _userRepository.GetAllUsersAsync(search, cancellationToken);
    }

    public async Task<bool> AdjustCreditsAsync(Guid userId, int delta, CancellationToken cancellationToken = default)
    {
        return await _userRepository.AdjustCreditAsync(userId, delta, cancellationToken);
    }

    public async Task<List<ApiKeyEntity>> GetApiKeysAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Tự động đồng bộ các API Key từ biến môi trường vào DB nếu chưa có
            string? envGeminiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            if (string.IsNullOrWhiteSpace(envGeminiKey)) envGeminiKey = _configuration["Gemini:ApiKey"];

            string? envGroqKey = Environment.GetEnvironmentVariable("GROQ_API_KEY");
            if (string.IsNullOrWhiteSpace(envGroqKey)) envGroqKey = _configuration["Groq:ApiKey"];

            if (!string.IsNullOrWhiteSpace(envGeminiKey))
            {
                bool exists = await _dbContext.ApiKeys.AnyAsync(k => k.Provider == "gemini" && k.KeyValue == envGeminiKey.Trim(), cancellationToken);
                if (!exists)
                {
                    await _dbContext.ApiKeys.AddAsync(new ApiKeyEntity
                    {
                        Id = Guid.NewGuid(),
                        Provider = "gemini",
                        KeyValue = envGeminiKey.Trim(),
                        Status = "Healthy",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }, cancellationToken);
                }
            }

            if (!string.IsNullOrWhiteSpace(envGroqKey))
            {
                bool exists = await _dbContext.ApiKeys.AnyAsync(k => k.Provider == "groq" && k.KeyValue == envGroqKey.Trim(), cancellationToken);
                if (!exists)
                {
                    await _dbContext.ApiKeys.AddAsync(new ApiKeyEntity
                    {
                        Id = Guid.NewGuid(),
                        Provider = "groq",
                        KeyValue = envGroqKey.Trim(),
                        Status = "Healthy",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }, cancellationToken);
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi đồng bộ API keys từ biến môi trường.");
        }

        return await _dbContext.ApiKeys.OrderByDescending(k => k.CreatedAt).ToListAsync(cancellationToken);
    }

    public async Task<ApiKeyEntity> AddApiKeyAsync(CreateApiKeyRequest request, CancellationToken cancellationToken = default)
    {
        var key = new ApiKeyEntity
        {
            Provider = request.Provider.Trim().ToLowerInvariant(),
            KeyValue = request.KeyValue.Trim(),
            Status = "Healthy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        await _dbContext.ApiKeys.AddAsync(key, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return key;
    }

    public async Task<bool> DeleteApiKeyAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var key = await _dbContext.ApiKeys.FindAsync(new object[] { id }, cancellationToken);
        if (key == null) return false;
        _dbContext.ApiKeys.Remove(key);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ApiKeyEntity> CheckApiKeyHealthAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var key = await _dbContext.ApiKeys.FindAsync(new object[] { id }, cancellationToken);
        if (key == null) throw new KeyNotFoundException("Không tìm thấy API Key.");

        var client = _httpClientFactory.CreateClient();
        var sw = Stopwatch.StartNew();
        try
        {
            if (key.Provider == "groq")
            {
                var req = new HttpRequestMessage(HttpMethod.Get, "https://api.groq.com/openai/v1/models");
                req.Headers.Add("Authorization", $"Bearer {key.KeyValue}");
                var res = await client.SendAsync(req, cancellationToken);
                sw.Stop();
                key.LatencyMs = sw.ElapsedMilliseconds;
                key.LastCheckedAt = DateTime.UtcNow;
                key.Status = res.IsSuccessStatusCode ? "Healthy" : (res.StatusCode == System.Net.HttpStatusCode.TooManyRequests ? "RateLimited" : "Dead");
            }
            else
            {
                // Gemini health check
                string url = $"https://generativelanguage.googleapis.com/v1beta/models?key={key.KeyValue}";
                var res = await client.GetAsync(url, cancellationToken);
                sw.Stop();
                key.LatencyMs = sw.ElapsedMilliseconds;
                key.LastCheckedAt = DateTime.UtcNow;
                key.Status = res.IsSuccessStatusCode ? "Healthy" : (res.StatusCode == System.Net.HttpStatusCode.TooManyRequests ? "RateLimited" : "Dead");
            }
        }
        catch
        {
            sw.Stop();
            key.LatencyMs = sw.ElapsedMilliseconds;
            key.LastCheckedAt = DateTime.UtcNow;
            key.Status = "Dead";
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return key;
    }

    public async Task<ApiKeyEntity?> ToggleApiKeyStatusAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var key = await _dbContext.ApiKeys.FindAsync(new object[] { id }, cancellationToken);
        if (key == null) return null;
        key.IsActive = !key.IsActive;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return key;
    }

    public async Task<List<PricingTierEntity>> GetPricingTiersAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var tiers = await _dbContext.PricingTiers.OrderBy(p => p.SortOrder).ToListAsync(cancellationToken);
            if (tiers.Count == 0)
            {
                tiers = GetDefaultPricingTiers();
                await _dbContext.PricingTiers.AddRangeAsync(tiers, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            return tiers;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Bảng pricing_tiers bị lỗi schema hoặc chưa tồn tại. Đang tự động sửa schema...");
            try
            {
                const string fixSql = @"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_tiers' AND column_name='Id' AND data_type='uuid') THEN
        DROP TABLE pricing_tiers CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pricing_tiers (
    ""Id"" VARCHAR(50) PRIMARY KEY,
    ""Name"" VARCHAR(100) NOT NULL,
    ""PriceUsd"" NUMERIC(10,2) NOT NULL,
    ""SongCount"" INT NOT NULL,
    ""DiscountPercent"" INT NOT NULL DEFAULT 0,
    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
    ""SortOrder"" INT NOT NULL DEFAULT 0,
    ""FeaturesJson"" TEXT DEFAULT '[]',
    ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_tiers' AND column_name='SortOrder') THEN
        ALTER TABLE pricing_tiers ADD COLUMN ""SortOrder"" INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_tiers' AND column_name='FeaturesJson') THEN
        ALTER TABLE pricing_tiers ADD COLUMN ""FeaturesJson"" TEXT DEFAULT '[]';
    END IF;
END $$;
";
                await _dbContext.Database.ExecuteSqlRawAsync(fixSql, cancellationToken);
                var tiers = await _dbContext.PricingTiers.OrderBy(p => p.SortOrder).ToListAsync(cancellationToken);
                if (tiers.Count == 0)
                {
                    tiers = GetDefaultPricingTiers();
                    await _dbContext.PricingTiers.AddRangeAsync(tiers, cancellationToken);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
                return tiers;
            }
            catch (Exception innerEx)
            {
                _logger.LogError(innerEx, "Không thể khôi phục bảng pricing_tiers trong DB. Trả về in-memory defaults.");
                return GetDefaultPricingTiers();
            }
        }
    }

    private static List<PricingTierEntity> GetDefaultPricingTiers()
    {
        return new List<PricingTierEntity>
        {
            new() { Id = "starter", Name = "Starter Pack", PriceUsd = 3.00m, SongCount = 10, DiscountPercent = 0, SortOrder = 1, FeaturesJson = "[\"10 bài hát đầy đủ 4 tầng phiên âm\", \"Hỗ trợ 5 ngôn ngữ quốc tế\", \"Xuất file LRC & TXT\"]" },
            new() { Id = "pro", Name = "Pro Musician", PriceUsd = 6.00m, SongCount = 25, DiscountPercent = 20, SortOrder = 2, FeaturesJson = "[\"25 bài hát chuẩn phòng thu\", \"Ưu tiên xử lý tốc độ cao\", \"Tự động sửa và đổi giọng AI\", \"Hỗ trợ đa ngôn ngữ không giới hạn\"]" },
            new() { Id = "studio", Name = "Studio Unlimited", PriceUsd = 15.00m, SongCount = 70, DiscountPercent = 30, SortOrder = 3, FeaturesJson = "[\"70 bài hát bóc tách lời cover\", \"Tốc độ xử lý siêu tốc LPU Groq\", \"Lưu trữ Cloud PostgreSQL trọn đời\", \"Hỗ trợ kỹ thuật 24/7\"]" }
        };
    }

    public async Task<PricingTierEntity> UpdatePricingTierAsync(string id, UpdatePricingTierRequest request, CancellationToken cancellationToken = default)
    {
        var tier = await _dbContext.PricingTiers.FindAsync(new object[] { id }, cancellationToken);
        if (tier == null) throw new KeyNotFoundException($"Không tìm thấy gói {id}");

        tier.PriceUsd = request.PriceUsd;
        tier.SongCount = request.SongCount;
        tier.DiscountPercent = request.DiscountPercent;
        tier.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return tier;
    }

    public async Task<PricingTierEntity> CreatePricingTierAsync(CreatePricingTierRequest request, CancellationToken cancellationToken = default)
    {
        var tier = new PricingTierEntity
        {
            Id = request.Id.Trim().ToLowerInvariant(),
            Name = request.Name.Trim(),
            PriceUsd = request.PriceUsd,
            SongCount = request.SongCount,
            DiscountPercent = request.DiscountPercent,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder
        };
        await _dbContext.PricingTiers.AddAsync(tier, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return tier;
    }

    public async Task<bool> DeletePricingTierAsync(string id, CancellationToken cancellationToken = default)
    {
        var tier = await _dbContext.PricingTiers.FindAsync(new object[] { id }, cancellationToken);
        if (tier == null) return false;
        _dbContext.PricingTiers.Remove(tier);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private string GetJwtSecret()
    {
        string? secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret)) secret = _configuration["JWT_SECRET_KEY"];
        if (string.IsNullOrWhiteSpace(secret)) secret = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(secret)) secret = Environment.GetEnvironmentVariable("Jwt__SecretKey");
        if (string.IsNullOrWhiteSpace(secret)) secret = "LyricPhonics_Default_Fallback_Secret_Key_32bytes_Long!";
        return secret;
    }

    private string GenerateChallengeToken(string email)
    {
        string secret = GetJwtSecret();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("challenge", "admin_layer1"),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: "LyricPhonics",
            audience: "LyricPhonicsAudience",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private bool ValidateChallengeToken(string token, out string? email)
    {
        email = null;
        string secret = GetJwtSecret();
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out _);

            var challengeClaim = principal.FindFirst("challenge");
            if (challengeClaim?.Value != "admin_layer1") return false;

            email = principal.FindFirst(ClaimTypes.Email)?.Value ?? principal.FindFirst(JwtRegisteredClaimNames.Email)?.Value;
            return !string.IsNullOrWhiteSpace(email);
        }
        catch
        {
            return false;
        }
    }

    private string GenerateAdminJwtToken(string email)
    {
        string secret = GetJwtSecret();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, "admin-universe-super-user"),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("role", "SuperAdmin"),
            new Claim("isAdmin", "True"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: "LyricPhonics",
            audience: "LyricPhonicsAudience",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
