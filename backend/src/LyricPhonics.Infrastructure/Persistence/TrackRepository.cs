using Microsoft.EntityFrameworkCore;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Entities;

namespace LyricPhonics.Infrastructure.Persistence;

/// <summary>
/// Triển khai ITrackRepository sử dụng EF Core và Neon PostgreSQL.
/// </summary>
public class TrackRepository : ITrackRepository
{
    private readonly LyricPhonicsDbContext _dbContext;

    public TrackRepository(LyricPhonicsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TrackEntity> SaveTrackAsync(TrackEntity track, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.Tracks.FindAsync(new object[] { track.Id }, cancellationToken);
        if (existing == null)
        {
            await _dbContext.Tracks.AddAsync(track, cancellationToken);
        }
        else
        {
            existing.Title = track.Title;
            existing.Artist = track.Artist;
            existing.FileName = track.FileName;
            existing.DetectedLanguage = track.DetectedLanguage;
            existing.Duration = track.Duration;
            existing.LinesJson = track.LinesJson;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return track;
    }

    public async Task<List<TrackEntity>> GetAllTracksAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Tracks
            .AsNoTracking()
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<TrackEntity?> GetTrackByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Tracks.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<bool> DeleteTrackAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var track = await _dbContext.Tracks.FindAsync(new object[] { id }, cancellationToken);
        if (track == null) return false;

        _dbContext.Tracks.Remove(track);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
