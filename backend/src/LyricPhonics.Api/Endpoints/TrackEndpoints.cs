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

        // 1. Lấy danh sách bài hát theo người dùng đã đăng nhập trong Database
        group.MapGet("/", async (
            HttpContext context,
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

            var authService = serviceProvider.GetRequiredService<IAuthService>();
            Guid? userId = null;
            if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                userId = authService.ValidateToken(authHeader.ToString());
            }

            // Nếu chưa đăng nhập: trả về danh sách rỗng (bài cloud gắn theo tài khoản)
            if (userId == null)
            {
                return Results.Ok(new
                {
                    success = true,
                    data = Array.Empty<object>()
                });
            }

            var userRepo = serviceProvider.GetService<IUserRepository>();
            var currentUser = userRepo != null ? await userRepo.GetByIdAsync(userId.Value, cancellationToken) : null;
            bool isAdmin = currentUser?.IsAdmin ?? false;

            var allTracks = await repository.GetAllTracksAsync(cancellationToken);
            var userTracks = isAdmin ? allTracks : allTracks.Where(t => t.UserId == userId).ToList();

            var summaries = userTracks.Select(t => new
            {
                id = t.Id,
                title = t.Title,
                artist = t.Artist,
                fileName = t.FileName,
                audioUrl = t.AudioUrl,
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
        .WithSummary("Lấy danh sách bài hát của người dùng trong Cloud Database");

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
                    audioUrl = track.AudioUrl,
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

        // 3. Xóa bài hát khỏi Database và Cloudflare R2
        group.MapDelete("/{id:guid}", async (
            Guid id,
            HttpContext context,
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken) =>
        {
            var repository = serviceProvider.GetService<ITrackRepository>();
            if (repository == null)
            {
                return Results.BadRequest(new { success = false, error = "Database chưa được cấu hình." });
            }

            var track = await repository.GetTrackByIdAsync(id, cancellationToken);
            if (track == null)
            {
                return Results.NotFound(new { success = false, error = $"Không tìm thấy bài hát có mã {id}" });
            }

            // Kiểm tra quyền sở hữu (chỉ người dùng sở hữu bài hát hoặc Admin mới được xóa)
            var authService = serviceProvider.GetRequiredService<IAuthService>();
            Guid? userId = null;
            if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                userId = authService.ValidateToken(authHeader.ToString());
            }

            var userRepo = serviceProvider.GetService<IUserRepository>();
            var currentUser = userId != null && userRepo != null ? await userRepo.GetByIdAsync(userId.Value, cancellationToken) : null;
            bool isAdmin = currentUser?.IsAdmin ?? false;

            if (!isAdmin)
            {
                if (userId == null)
                {
                    return Results.Json(new { success = false, error = "Vui lòng đăng nhập để thực hiện thao tác này." }, statusCode: 401);
                }

                if (track.UserId != userId)
                {
                    return Results.Json(new { success = false, error = "Bạn không có quyền xóa bài hát này." }, statusCode: 403);
                }
            }

            // Nếu có file trên Cloudflare R2, tiến hành xóa file
            if (!string.IsNullOrWhiteSpace(track.AudioStorageKey))
            {
                var storageService = serviceProvider.GetService<IStorageService>();
                if (storageService != null)
                {
                    await storageService.DeleteAudioAsync(track.AudioStorageKey, cancellationToken);
                }
            }

            bool deleted = await repository.DeleteTrackAsync(id, cancellationToken);
            if (!deleted)
            {
                return Results.NotFound(new { success = false, error = $"Không thể xóa bài hát có mã {id}" });
            }

            return Results.Ok(new { success = true, message = "Đã xóa bài hát khỏi cơ sở dữ liệu." });
        })
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .WithSummary("Xóa bài hát khỏi cơ sở dữ liệu");

        // 4. Đồng bộ bài hát từ Client/Offline lên PostgreSQL Database
        group.MapPost("/sync", async (
            TrackSyncDto request,
            HttpContext context,
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken) =>
        {
            var repository = serviceProvider.GetService<ITrackRepository>();
            if (repository == null)
            {
                return Results.BadRequest(new { success = false, error = "Database chưa được cấu hình." });
            }

            var authService = serviceProvider.GetRequiredService<IAuthService>();
            Guid? userId = null;
            if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                userId = authService.ValidateToken(authHeader.ToString());
            }

            if (userId == null)
            {
                return Results.Json(new { success = false, error = "Vui lòng đăng nhập tài khoản để đồng bộ bài hát lên Đám mây." }, statusCode: 401);
            }

            Guid trackId = Guid.TryParse(request.Id, out var parsedId) ? parsedId : Guid.NewGuid();

            var track = new TrackEntity
            {
                Id = trackId,
                UserId = userId,
                Title = !string.IsNullOrWhiteSpace(request.Title) ? request.Title : "Untitled Track",
                Artist = !string.IsNullOrWhiteSpace(request.Artist) ? request.Artist : "Unknown Artist",
                FileName = request.FileName ?? string.Empty,
                DetectedLanguage = request.DetectedLanguage ?? "auto",
                TargetLanguage = request.TargetLanguage ?? "vi",
                Duration = request.Duration,
                LinesJson = JsonSerializer.Serialize(request.Lines ?? new List<LyricLine>()),
                AudioUrl = request.AudioUrl,
                UpdatedAt = DateTime.UtcNow
            };

            var saved = await repository.SaveTrackAsync(track, cancellationToken);
            return Results.Ok(new
            {
                success = true,
                message = "Đã đồng bộ bài hát thành công lên Neon PostgreSQL Database!",
                trackId = saved.Id
            });
        })
        .Produces(StatusCodes.Status200OK)
        .WithSummary("Đồng bộ bài hát từ Offline lên Neon PostgreSQL");

        return app;
    }
}

public record TrackSyncDto(
    string? Id,
    string Title,
    string? Artist,
    string? FileName,
    string? DetectedLanguage,
    string? TargetLanguage,
    double Duration,
    List<LyricLine>? Lines,
    string? AudioUrl = null
);
