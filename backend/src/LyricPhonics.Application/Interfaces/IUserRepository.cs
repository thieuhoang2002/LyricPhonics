using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using LyricPhonics.Domain.Entities;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện Repository quản lý dữ liệu người dùng trong hệ thống.
/// </summary>
public interface IUserRepository
{
    Task<UserEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<int> CountByIpAsync(string ip, CancellationToken cancellationToken = default);
    Task<UserEntity> CreateUserAsync(UserEntity user, CancellationToken cancellationToken = default);
    Task<UserEntity> UpdateUserAsync(UserEntity user, CancellationToken cancellationToken = default);
    Task<List<UserEntity>> GetAllUsersAsync(string? search = null, CancellationToken cancellationToken = default);
    Task<bool> DeductCreditAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> AdjustCreditAsync(Guid userId, int delta, CancellationToken cancellationToken = default);
}
