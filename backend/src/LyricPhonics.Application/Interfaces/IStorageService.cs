using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện dịch vụ lưu trữ đối tượng (Cloudflare R2 / S3 Object Storage)
/// cho phép upload và quản lý file âm thanh bài hát trên đám mây.
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Cho biết dịch vụ Cloudflare R2 đã được cấu hình đầy đủ credentials hay chưa
    /// </summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Upload file âm thanh lên Cloudflare R2 bucket.
    /// </summary>
    /// <param name="fileStream">Luồng dữ liệu Stream của file</param>
    /// <param name="fileName">Tên file gốc</param>
    /// <param name="contentType">MIME type (audio/mpeg, video/mp4...)</param>
    /// <param name="userId">ID người dùng sở hữu</param>
    /// <param name="trackId">ID bài hát</param>
    /// <param name="cancellationToken">Cancellation Token</param>
    /// <returns>Tuple chứa AudioUrl (URL nghe nhạc) và StorageKey (Khóa đối tượng R2)</returns>
    Task<(string? audioUrl, string? storageKey)> UploadAudioAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        Guid userId,
        Guid trackId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Xóa file âm thanh khỏi Cloudflare R2.
    /// </summary>
    Task<bool> DeleteAudioAsync(string storageKey, CancellationToken cancellationToken = default);
}
