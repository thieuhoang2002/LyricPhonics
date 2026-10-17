using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Entities;

namespace LyricPhonics.Infrastructure.Persistence;

/// <summary>
/// Triển khai IUserRepository sử dụng EF Core và PostgreSQL Neon DB.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly LyricPhonicsDbContext _dbContext;

    public UserRepository(LyricPhonicsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Users.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<UserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        return await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);
    }

    public async Task<int> CountByIpAsync(string ip, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ip)) return 0;
        return await _dbContext.Users
            .CountAsync(u => u.RegistrationIp == ip, cancellationToken);
    }

    public async Task<UserEntity> CreateUserAsync(UserEntity user, CancellationToken cancellationToken = default)
    {
        user.Email = user.Email.Trim().ToLowerInvariant();
        await _dbContext.Users.AddAsync(user, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<UserEntity> UpdateUserAsync(UserEntity user, CancellationToken cancellationToken = default)
    {
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<List<UserEntity>> GetAllUsersAsync(string? search = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(u => u.Email.ToLower().Contains(term) || u.RegistrationIp.Contains(term));
        }

        return await query
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DeductCreditAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null || user.SongCredits <= 0) return false;

        user.SongCredits -= 1;
        user.TotalSongsCreated += 1;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> AdjustCreditAsync(Guid userId, int delta, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return false;

        user.SongCredits = Math.Max(0, user.SongCredits + delta);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
