using LyricPhonics.Application.Interfaces;

namespace LyricPhonics.Api.Endpoints;

/// <summary>
/// Định nghĩa các Endpoint bóc tách âm thanh sử dụng ASP.NET Core Minimal API.
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (Minimal APIs vs Controllers):
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
        "video/mp4",
        "video/webm"
    };

    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25 MB

    public static IEndpointRouteBuilder MapTranscribeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transcribe")
            .WithTags("Transcription")
            .WithOpenApi();

        group.MapPost("/", async (
            IFormFile? file,
            ITranscriptionService transcriptionService,
            CancellationToken cancellationToken) =>
        {
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

            // 3. Kiểm tra định dạng MIME hợp lệ (Content Isolation & Security)
            string contentType = file.ContentType;
            if (!AllowedMimeTypes.Contains(contentType))
            {
                // Kiểm tra dự phòng theo đuôi file nếu trình duyệt gửi MIME không chuẩn
                string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                contentType = extension switch
                {
                    ".mp3" => "audio/mpeg",
                    ".wav" => "audio/wav",
                    ".m4a" => "audio/x-m4a",
                    ".mp4" => "video/mp4",
                    ".ogg" => "audio/ogg",
                    _ => contentType
                };

                if (!AllowedMimeTypes.Contains(contentType))
                {
                    return Results.BadRequest(new
                    {
                        success = false,
                        error = $"Định dạng tệp '{extension}' không được hỗ trợ. Vui lòng tải lên MP3, WAV, M4A hoặc MP4."
                    });
                }
            }

            // 4. Mở luồng Stream và chuyển tiếp sang dịch vụ AI
            // 💡 KIẾN THỨC C#: file.OpenReadStream() không load toàn bộ vào mảng byte[] trên RAM,
            // giúp tiết kiệm bộ nhớ máy chủ tối đa khi có hàng trăm request đồng thời.
            using var stream = file.OpenReadStream();

            var result = await transcriptionService.TranscribeAudioAsync(
                stream,
                contentType,
                file.FileName,
                cancellationToken
            );

            // 5. Trả về kết quả JSON theo định dạng chuẩn mà Frontend mong đợi
            return Results.Ok(new
            {
                success = true,
                metadata = result.Metadata,
                lines = result.Lines
            });
        })
        .Accepts<IFormFile>("multipart/form-data")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status500InternalServerError)
        .WithSummary("Bóc tách âm thanh sang lời bài hát 3 tầng kèm mốc thời gian")
        .DisableAntiforgery(); // Tắt antiforgery cho API công khai phục vụ SPA Frontend

        return app;
    }
}
