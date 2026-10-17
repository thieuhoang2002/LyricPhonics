using System.Text.Json;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Entities;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Api.Endpoints;

/// <summary>
/// Các endpoint quản lý bài hát đã lưu trữ trong cơ sở dữ liệu PostgreSQL (Neon Serverless DB).
/// </summary>
public static class TrackEndpoints
{
    public static IEndpointRouteBuilder MapTrackEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tracks")
            .WithTags("Tracks")
            .WithOpenApi();

        // 1. Lấy danh sách tất cả bài hát đã lưu trong Database
        group.MapGet("/", async (
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken) =>
        {
            var repository = serviceProvider.GetService<ITrackRepository>();
            if (repository == null)
            {
                return Results.Ok(new
                {
                    success = true,
                    data = Array.Empty<object>(),
                    message = "Database chưa được cấu hình. Đang chạy chế độ offline."
                });
            }

            var tracks = await repository.GetAllTracksAsync(cancellationToken);
            var summaries = tracks.Select(t => new
            {
                id = t.Id,
                title = t.Title,
                artist = t.Artist,
                fileName = t.FileName,
                detectedLanguage = t.DetectedLanguage,
                targetLanguage = t.TargetLanguage,
                duration = t.Duration,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt
            });

            return Results.Ok(new
            {
                success = true,
                data = summaries
            });
        })
        .Produces(StatusCodes.Status200OK)
        .WithSummary("Lấy danh sách bài hát đã lưu trong PostgreSQL (Neon DB)");

        // 2. Lấy chi tiết một bài hát (kèm danh sách lời)
        group.MapGet("/{id:guid}", async (
            Guid id,
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken) =>
        {
            var repository = serviceProvider.GetService<ITrackRepository>();
            if (repository == null)
            {
                return Results.NotFound(new { success = false, error = "Database chưa được cấu hình." });
            }

            var track = await repository.GetTrackByIdAsync(id, cancellationToken);
            if (track == null)
            {
                return Results.NotFound(new { success = false, error = $"Không tìm thấy bài hát có mã {id}" });
            }

            List<LyricLine>? lines = null;
            try
            {
                lines = JsonSerializer.Deserialize<List<LyricLine>>(track.LinesJson);
            }
            catch
            {
                lines = new List<LyricLine>();
            }

            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    id = track.Id,
                    metadata = new TranscriptionMetadata(
                        Title: track.Title,
                        Artist: track.Artist,
                        DetectedLanguage: track.DetectedLanguage
                    ),
                    lines = lines ?? new List<LyricLine>()
                }
            });
        })
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .WithSummary("Lấy chi tiết bài hát và lời từ PostgreSQL");

        // 3. Xóa bài hát khỏi Database
        group.MapDelete("/{id:guid}", async (
            Guid id,
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken) =>
        {
            var repository = serviceProvider.GetService<ITrackRepository>();
            if (repository == null)
            {
                return Results.BadRequest(new { success = false, error = "Database chưa được cấu hình." });
            }

            bool deleted = await repository.DeleteTrackAsync(id, cancellationToken);
            if (!deleted)
            {
                return Results.NotFound(new { success = false, error = $"Không tìm thấy bài hát có mã {id}" });
            }

            return Results.Ok(new { success = true, message = "Đã xóa bài hát khỏi cơ sở dữ liệu." });
        })
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .WithSummary("Xóa bài hát khỏi cơ sở dữ liệu");

        return app;
    }
}
