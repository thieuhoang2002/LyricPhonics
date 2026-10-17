using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication");

        group.MapPost("/register", async (
            RegisterRequest request,
            HttpContext context,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            string clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
            {
                clientIp = forwardedFor.ToString().Split(',')[0].Trim();
            }

            var result = await authService.RegisterAsync(request, clientIp, cancellationToken);
            if (!result.Success)
            {
                return Results.BadRequest(new { error = result.Message });
            }

            return Results.Ok(result);
        })
        .WithName("Register")
        .WithSummary("Đăng ký tài khoản người dùng mới (Giới hạn tối đa 3 tài khoản/IP, tặng 2 lượt bài hát)");

        group.MapPost("/login", async (
            LoginRequest request,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            var result = await authService.LoginAsync(request, cancellationToken);
            if (!result.Success)
            {
                return Results.Json(new { error = result.Message }, statusCode: 401);
            }

            return Results.Ok(result);
        })
        .WithName("Login")
        .WithSummary("Đăng nhập tài khoản người dùng");

        group.MapGet("/me", async (
            HttpContext context,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            if (!context.Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                return Results.Unauthorized();
            }

            var userId = authService.ValidateToken(authHeader.ToString());
            if (userId == null)
            {
                return Results.Unauthorized();
            }

            var user = await authService.GetUserByIdAsync(userId.Value, cancellationToken);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            var profile = new UserProfileDto(
                Id: user.Id,
                Email: user.Email,
                SongCredits: user.SongCredits,
                TotalSongsCreated: user.TotalSongsCreated,
                IsAdmin: user.IsAdmin,
                CreatedAt: user.CreatedAt
            );

            return Results.Ok(profile);
        })
        .WithName("GetCurrentUser")
        .WithSummary("Lấy thông tin tài khoản và số lượt bài hát còn lại của người dùng");

        return app;
    }
}
