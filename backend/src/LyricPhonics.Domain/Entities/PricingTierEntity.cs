using System;

namespace LyricPhonics.Domain.Entities;

/// <summary>
/// Đại diện cho gói đăng ký / mua thêm lượt bài hát trong hệ thống.
/// </summary>
public class PricingTierEntity
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public decimal PriceUsd { get; set; }

    public int SongCount { get; set; }

    public int DiscountPercent { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; } = 0;

    public string FeaturesJson { get; set; } = "[]";
}
