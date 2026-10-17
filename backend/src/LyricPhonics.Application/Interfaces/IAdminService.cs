using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using LyricPhonics.Domain.Entities;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện dịch vụ Quản trị Vũ trụ Bí mật (/thhoang-admin-universe) với Bảo mật 2 lớp quân sự.
/// </summary>
public interface IAdminService
{
    Task<AdminLayer1Result> LoginLayer1Async(AdminLayer1Request request, CancellationToken cancellationToken = default);
    Task<AdminLayer2Result> VerifyLayer2Async(AdminLayer2Request request, CancellationToken cancellationToken = default);
    
    // Quản lý người dùng
    Task<List<UserEntity>> GetUsersAsync(string? search = null, CancellationToken cancellationToken = default);
    Task<bool> AdjustCreditsAsync(Guid userId, int delta, CancellationToken cancellationToken = default);

    // Quản lý API Key & Health check
    Task<List<ApiKeyEntity>> GetApiKeysAsync(CancellationToken cancellationToken = default);
    Task<ApiKeyEntity> AddApiKeyAsync(CreateApiKeyRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteApiKeyAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiKeyEntity> CheckApiKeyHealthAsync(Guid id, CancellationToken cancellationToken = default);

    // Quản lý gói thanh toán / Pricing Tiers
    Task<List<PricingTierEntity>> GetPricingTiersAsync(CancellationToken cancellationToken = default);
    Task<PricingTierEntity> UpdatePricingTierAsync(string id, UpdatePricingTierRequest request, CancellationToken cancellationToken = default);
    Task<PricingTierEntity> CreatePricingTierAsync(CreatePricingTierRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeletePricingTierAsync(string id, CancellationToken cancellationToken = default);
}
