using LyricPhonics.Application.Interfaces;

namespace LyricPhonics.Api.Endpoints;

/// <summary>
/// Định nghĩa các Endpoint bóc tách âm thanh sử dụng ASP.NET Core Minimal API.
/// 
/// 💡 Thiết kế kỹ thuật (Minimal APIs vs Controllers):
/// - Minimal APIs xuất hiện từ .NET 6 và hoàn thiện vượt bậc trong .NET 8.
/// - Loại bỏ lớp Controller cồng kềnh, giảm thiểu tối đa overhead và tăng thông lượng (RPS - Requests Per Second).
/// - Dễ dàng test, cú pháp lambda gọn gàng, hỗ trợ Dependency Injection trực tiếp vào tham số hàm.
/// </summary>
public static class TranscribeEndpoints
{
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
        "audio/ogg",
        "audio/webm",
        "audio/aac",
        "audio/flac",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-m4v"
    };

    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    public static IEndpointRouteBuilder MapTranscribeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transcribe")
            .WithTags("Transcription")
            .WithOpenApi();

        group.MapPost("/", async (
            HttpRequest request,
            ITranscriptionService transcriptionService,
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
                    message = "Vui lòng đăng nhập tài khoản để tạo và lưu lời bài hát."
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
                    message = "Bạn đã sử dụng hết lượt tạo bài hát (còn 0 lượt). Vui lòng mua thêm gói để tiếp tục!",
                    songCredits = 0
                }, statusCode: 403);
            }

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

            // 1. Kiểm tra sự tồn tại của file tải lên
            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = "Vui lòng chọn một tệp âm thanh hoặc video hợp lệ."
                });
            }

            // 2. Kiểm tra giới hạn kích thước file (Tối đa 25MB)
            if (file.Length > MaxFileSizeBytes)
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = $"Dung lượng file vượt quá giới hạn cho phép ({file.Length / (1024 * 1024)}MB > 25MB)."
                });
            }

            // 3. Kiểm tra và chuẩn hóa định dạng MIME hợp lệ
            string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            string contentType = file.ContentType;

            if (string.IsNullOrWhiteSpace(contentType) || contentType == "application/octet-stream" || !AllowedMimeTypes.Contains(contentType))
            {
                contentType = extension switch
                {
                    ".mp3" => "audio/mpeg",
                    ".wav" => "audio/wav",
                    ".m4a" => "audio/x-m4a",
                    ".mp4" => "video/mp4",
                    ".mov" => "video/mp4",
                    ".m4v" => "video/mp4",
                    ".ogg" => "audio/ogg",
                    ".webm" => "video/webm",
                    ".aac" => "audio/aac",
                    ".flac" => "audio/flac",
                    _ => contentType
                };

                if (!AllowedMimeTypes.Contains(contentType))
                {
                    return Results.BadRequest(new
                    {
                        success = false,
                        error = $"Định dạng tệp '{extension}' không được hỗ trợ. Vui lòng tải lên MP3, WAV, M4A, MP4 hoặc MOV."
                    });
                }
            }

            // 4. Mở luồng Stream và chuyển tiếp sang dịch vụ AI
            // 💡 Lưu ý hiệu năng: file.OpenReadStream() không load toàn bộ vào mảng byte[] trên RAM,
            // giúp tiết kiệm bộ nhớ máy chủ tối đa khi có hàng trăm request đồng thời.
            using var stream = file.OpenReadStream();

            string targetLang = form["targetLang"].FirstOrDefault() 
                ?? request.Query["targetLang"].FirstOrDefault() 
                ?? "vi";

            var result = await transcriptionService.TranscribeAudioAsync(
                stream,
                contentType,
                file.FileName,
                targetLang,
                cancellationToken
            );

            // 5. Tự động tải file âm thanh lên Cloudflare R2 và lưu trữ thông tin vào PostgreSQL
            Guid newTrackId = Guid.NewGuid();
            Guid? savedTrackId = null;
            string? audioUrl = null;
            string? storageKey = null;

            var storageService = serviceProvider.GetService<IStorageService>();
            if (storageService != null && storageService.IsConfigured)
            {
                try
                {
                    using var uploadStream = file.OpenReadStream();
                    var uploadResult = await storageService.UploadAudioAsync(
                        uploadStream,
                        file.FileName,
                        contentType,
                        userId.Value,
                        newTrackId,
                        cancellationToken
                    );
                    audioUrl = uploadResult.audioUrl;
                    storageKey = uploadResult.storageKey;
                }
                catch (Exception r2Ex)
                {
                    var logger = serviceProvider.GetService<ILoggerFactory>()?.CreateLogger("TranscribeEndpoints");
                    logger?.LogWarning(r2Ex, "Không thể tải file âm thanh lên Cloudflare R2.");
                }
            }

            var trackRepository = serviceProvider.GetService<ITrackRepository>();
            if (trackRepository != null)
            {
                try
                {
                    var saved = await trackRepository.SaveTrackAsync(new LyricPhonics.Domain.Entities.TrackEntity
                    {
                        Id = newTrackId,
                        UserId = userId,
                        Title = result.Metadata.Title ?? Path.GetFileNameWithoutExtension(file.FileName),
                        Artist = result.Metadata.Artist ?? "Unknown Artist",
                        FileName = file.FileName,
                        DetectedLanguage = result.Metadata.DetectedLanguage ?? "auto",
                        TargetLanguage = targetLang,
                        Duration = result.Lines.Count > 0 ? result.Lines.Max(l => l.EndTime) : 0,
                        LinesJson = System.Text.Json.JsonSerializer.Serialize(result.Lines),
                        AudioUrl = audioUrl,
                        AudioStorageKey = storageKey
                    }, cancellationToken);
                    savedTrackId = saved.Id;
                }
                catch (Exception dbEx)
                {
                    // Lỗi database không làm gián đoạn việc trả về kết quả cho người dùng
                    var logger = serviceProvider.GetService<ILoggerFactory>()?.CreateLogger("TranscribeEndpoints");
                    logger?.LogWarning(dbEx, "Không thể tự động lưu bài hát vào cơ sở dữ liệu PostgreSQL.");
                }
            }

            // 6. Trừ 1 lượt bài hát của người dùng
            int remainingCredits = user.SongCredits - 1;
            if (userRepository != null)
            {
                await userRepository.DeductCreditAsync(userId.Value, cancellationToken);
            }

            // 7. Trả về kết quả JSON theo định dạng chuẩn mà Frontend mong đợi
            return Results.Ok(new
            {
                success = true,
                trackId = savedTrackId,
                audioUrl = audioUrl,
                songCredits = Math.Max(0, remainingCredits),
                metadata = result.Metadata,
                lines = result.Lines
            });
        })
        .Accepts<IFormFile>("multipart/form-data")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status500InternalServerError)
        .WithSummary("Bóc tách âm thanh sang lời bài hát 4 tầng kèm mốc thời gian")
        .DisableAntiforgery(); // Tắt antiforgery cho API công khai phục vụ SPA Frontend

        return app;
    }
}
