using Microsoft.AspNetCore.Mvc;
using LyricPhonics.Application.Interfaces;

namespace LyricPhonics.Api.Endpoints;

public record RegeneratePhonicsRequest(
    string OriginalText,
    string? Language = null
);

/// <summary>
/// Endpoint tái tạo phiên âm 4 tầng tức thì khi người dùng chỉnh sửa lời bài hát gốc.
/// Sử dụng Groq AI LPU / Gemini.
/// </summary>
public static class PhonicsEndpoints
{
    public static IEndpointRouteBuilder MapPhonicsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/phonics")
            .WithTags("Phonics")
            .WithOpenApi();

        group.MapPost("/regenerate", async (
            [FromBody] RegeneratePhonicsRequest request,
            IPhonicsRegenerationService phonicsService,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.OriginalText))
            {
                return Results.BadRequest(new
                {
                    success = false,
                    error = "Lời bài hát gốc không được để trống."
                });
            }

            var result = await phonicsService.RegenerateLinePhonicsAsync(
                request.OriginalText,
                request.Language,
                cancellationToken
            );

            return Results.Ok(new
            {
                success = true,
                data = result
            });
        })
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .WithSummary("Tái tạo phiên âm chuẩn quốc tế, phiên âm tiếng Việt và dịch nghĩa cho câu hát")
        .DisableAntiforgery();

        return app;
    }
}
