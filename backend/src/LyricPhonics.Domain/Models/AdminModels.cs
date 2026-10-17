using System;

namespace LyricPhonics.Domain.Models;

/// <summary>
/// DTO cho đăng nhập Admin Lớp 1 (Mật khẩu từ appsettings.Development.json).
/// </summary>
public record AdminLayer1Request(
    string Email,
    string Password
);

public record AdminLayer1Result(
    bool Success,
    string? ChallengeToken,
    string? Hint,
    string? Message
);

/// <summary>
/// DTO cho xác thực Admin Lớp 2 (Web Crypto PBKDF2 100.000 vòng lặp + AES-256-GCM).
/// </summary>
public record AdminLayer2Request(
    string ChallengeToken,
    string MasterPassphrase
);

public record AdminLayer2Result(
    bool Success,
    string? AdminToken,
    string? Message
);

/// <summary>
/// DTO cộng/trừ lượt sử dụng bài hát cho người dùng.
/// </summary>
public record AdjustUserCreditsRequest(
    int Delta
);

/// <summary>
/// DTO thêm API key mới.
/// </summary>
public record CreateApiKeyRequest(
    string Provider,
    string KeyValue
);

/// <summary>
/// DTO cập nhật gói dịch vụ.
/// </summary>
public record UpdatePricingTierRequest(
    decimal PriceUsd,
    int SongCount,
    int DiscountPercent,
    bool IsActive
);

/// <summary>
/// DTO tạo gói dịch vụ mới.
/// </summary>
public record CreatePricingTierRequest(
    string Id,
    string Name,
    decimal PriceUsd,
    int SongCount,
    int DiscountPercent,
    bool IsActive,
    int SortOrder
);
