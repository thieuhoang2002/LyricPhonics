using LyricPhonics.Domain.Entities;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện kho lưu trữ bài hát (Repository Pattern).
/// Tách rời nghiệp vụ khỏi chi tiết triển khai cơ sở dữ liệu (PostgreSQL / Neon DB).
/// </summary>
public interface ITrackRepository
{
    Task<TrackEntity> SaveTrackAsync(TrackEntity track, CancellationToken cancellationToken = default);
    Task<List<TrackEntity>> GetAllTracksAsync(CancellationToken cancellationToken = default);
    Task<TrackEntity?> GetTrackByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> DeleteTrackAsync(Guid id, CancellationToken cancellationToken = default);
}
