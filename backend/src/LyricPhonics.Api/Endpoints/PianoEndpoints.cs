using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Api.Endpoints;

/// <summary>
/// Định nghĩa các Endpoint chuyển đổi âm thanh sang bản hòa âm Piano MIDI đa bè (Piano Studio).
/// 
/// 💡 Thiết kế kỹ thuật & Bảo vệ Credit:
/// 1. Dùng chung trường 'SongCredits' với hệ thống LyricPhonics.
/// 2. Bắt buộc đăng nhập trước khi xử lý.
/// 3. Giới hạn nghiêm ngặt: Chỉ nhận MP3, WAV, M4A và dung lượng <= 25MB.
/// 4. Đảm bảo toàn vẹn giao dịch (Transaction-safe): Chỉ trừ 1 lượt khi AI bóc tách nốt thành công.
///    Nếu lỗi file, lỗi mạng hoặc hết quota AI, 0 lượt bị trừ.
/// </summary>
public static class PianoEndpoints
{
    private static readonly string[] AllowedExtensions = { ".mp3", ".wav", ".m4a" };

    public static IEndpointRouteBuilder MapPianoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/piano")
            .WithTags("Piano Studio")
            .WithOpenApi();

        group.MapPost("/transcribe", async (
            HttpRequest request,
            IPianoTranscriptionService pianoService,
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken) =>
        {
            // 0. Xác thực tài khoản người dùng & kiểm tra số lượt bài hát (Credits)
            var authService = serviceProvider.GetRequiredService<IAuthService>();
            var userRepository = serviceProvider.GetService<IUserRepository>();

            Guid? userId = null;
            if (request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                userId = authService.ValidateToken(authHeader.ToString());
            }

            if (userId == null)
            {
                return Results.Json(new
                {
                    success = false,
                    error = "AUTH_REQUIRED",
                    message = "Vui lòng đăng nhập tài khoản để sử dụng tính năng Piano Studio."
                }, statusCode: 401);
            }

            var user = userRepository != null ? await userRepository.GetByIdAsync(userId.Value, cancellationToken) : null;
            if (user == null)
            {
                return Results.Json(new
                {
                    success = false,
                    error = "USER_NOT_FOUND",
                    message = "Tài khoản không tồn tại trong hệ thống."
                }, statusCode: 401);
            }

            if (user.SongCredits <= 0)
            {
                return Results.Json(new
                {
                    success = false,
                    error = "OUT_OF_CREDITS",
                    message = "Bạn đã sử dụng hết lượt tạo bài hát (còn 0 lượt). Vui lòng nạp thêm để tiếp tục!",
                    songCredits = 0
                }, statusCode: 403);
            }

            // 1. Kiểm tra định dạng Content-Type của Request
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = "Yêu cầu phải có định dạng multipart/form-data."
                });
            }

            var form = await request.ReadFormAsync(cancellationToken);
            var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();

            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = "Vui lòng chọn hoặc kéo thả tệp âm thanh hợp lệ."
                });
            }

            // 2. Kiểm tra dung lượng tệp: Tối đa 25MB (25 * 1024 * 1024 bytes)
            if (file.Length > 25 * 1024 * 1024)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = "Dung lượng tệp vượt quá 25MB. Vui lòng chọn tệp nhỏ hơn."
                });
            }

            // 3. Kiểm tra định dạng tệp: CHỈ CHẤP NHẬN .mp3, .wav, .m4a
            string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = "Hệ thống Piano Studio chỉ hỗ trợ tệp định dạng MP3, WAV hoặc M4A."
                });
            }

            string contentType = extension switch
            {
                ".mp3" => "audio/mpeg",
                ".wav" => "audio/wav",
                ".m4a" => "audio/x-m4a",
                _ => file.ContentType
            };

            // 4. Mở luồng Stream và chuyển tiếp sang dịch vụ AI
            using var stream = file.OpenReadStream();

            PianoTranscriptionResult result;
            try
            {
                result = await pianoService.TranscribePianoAsync(
                    stream,
                    contentType,
                    file.FileName,
                    cancellationToken
                );
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("hết lượt"))
            {
                return Results.Json(new
                {
                    success = false,
                    error = "DAILY_QUOTA_EXHAUSTED",
                    message = "Hôm nay hệ thống hết lượt rồi, chờ ngày mai."
                }, statusCode: 429);
            }
            catch (Exception ex)
            {
                var logger = serviceProvider.GetService<ILoggerFactory>()?.CreateLogger("PianoEndpoints");
                logger?.LogError(ex, "Lỗi xảy ra trong quá trình phân tích bài hát sang Piano.");

                return Results.Json(new
                {
                    success = false,
                    error = "TRANSCRIPTION_FAILED",
                    message = "Không thể phân tích nốt nhạc từ bài hát này. Vui lòng kiểm tra lại chất lượng tệp âm thanh."
                }, statusCode: 500);
            }

            // 5. TRỪ CREDIT AN TOÀN: Chỉ trừ 1 lượt khi AI đã bóc tách thành công
            int remainingCredits = user.SongCredits - 1;
            if (userRepository != null)
            {
                await userRepository.DeductCreditAsync(userId.Value, cancellationToken);
            }

            // 6. Trả về kết quả JSON theo định dạng chuẩn
            return Results.Ok(new
            {
                success = true,
                message = "Đã chuyển đổi bản Piano Cover thành công!",
                songCredits = Math.Max(0, remainingCredits),
                data = result
            });
        })
        .Accepts<IFormFile>("multipart/form-data")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden)
        .Produces(StatusCodes.Status429TooManyRequests)
        .WithSummary("Bóc tách âm thanh MP3/WAV/M4A sang bản Piano MIDI và vòng hợp âm");

        return app;
    }
}
