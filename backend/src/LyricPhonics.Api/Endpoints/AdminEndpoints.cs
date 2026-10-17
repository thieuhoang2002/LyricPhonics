using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Api.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Secret Admin Universe");

        // Lớp 1: Đăng nhập mật khẩu Server
        group.MapPost("/login-layer1", async (
            AdminLayer1Request request,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var result = await adminService.LoginLayer1Async(request, cancellationToken);
            if (!result.Success)
            {
                return Results.Json(new { error = result.Message }, statusCode: 401);
            }
            return Results.Ok(result);
        })
        .WithName("AdminLoginLayer1")
        .WithSummary("Đăng nhập Admin Lớp 1 (Mật khẩu cấu hình appsettings.Development.json)");

        // Lớp 2: Xác thực Web Crypto PBKDF2 (100.000 vòng lặp) + AES-256-GCM
        group.MapPost("/verify-layer2", async (
            AdminLayer2Request request,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var result = await adminService.VerifyLayer2Async(request, cancellationToken);
            if (!result.Success)
            {
                return Results.Json(new { error = result.Message }, statusCode: 403);
            }
            return Results.Ok(result);
        })
        .WithName("AdminVerifyLayer2")
        .WithSummary("Xác thực Admin Lớp 2 cấp quân sự (Web Crypto PBKDF2 + AES-256-GCM)");

        // Quản lý Users
        group.MapGet("/users", async (
            string? search,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var users = await adminService.GetUsersAsync(search, cancellationToken);
            return Results.Ok(users);
        })
        .WithName("AdminGetUsers")
        .WithSummary("Lấy danh sách người dùng, tra cứu IP và số lượt bài hát");

        group.MapPost("/users/{id:guid}/credits", async (
            Guid id,
            AdjustUserCreditsRequest request,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var success = await adminService.AdjustCreditsAsync(id, request.Delta, cancellationToken);
            if (!success)
            {
                return Results.NotFound(new { error = "Không tìm thấy người dùng." });
            }
            return Results.Ok(new { success = true, message = $"Đã điều chỉnh {request.Delta} lượt cho tài khoản." });
        })
        .WithName("AdminAdjustCredits")
        .WithSummary("Cộng hoặc trừ lượt tạo và lưu bài hát cho người dùng");

        // Quản lý API Key & Health check
        group.MapGet("/api-keys", async (
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var keys = await adminService.GetApiKeysAsync(cancellationToken);
            return Results.Ok(keys);
        })
        .WithName("AdminGetApiKeys")
        .WithSummary("Lấy danh sách API Key Gemini và Groq");

        group.MapPost("/api-keys", async (
            CreateApiKeyRequest request,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var key = await adminService.AddApiKeyAsync(request, cancellationToken);
            return Results.Ok(key);
        })
        .WithName("AdminAddApiKey")
        .WithSummary("Thêm API Key mới");

        group.MapDelete("/api-keys/{id:guid}", async (
            Guid id,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var success = await adminService.DeleteApiKeyAsync(id, cancellationToken);
            if (!success) return Results.NotFound();
            return Results.Ok(new { success = true });
        })
        .WithName("AdminDeleteApiKey")
        .WithSummary("Xóa API Key");

        group.MapPost("/api-keys/{id:guid}/health-check", async (
            Guid id,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var key = await adminService.CheckApiKeyHealthAsync(id, cancellationToken);
                return Results.Ok(key);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("AdminCheckApiKeyHealth")
        .WithSummary("Kiểm tra sức khỏe (Health Check Ping) API Key Gemini/Groq");

        // Quản lý Pricing Tiers
        group.MapGet("/pricing", async (
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var tiers = await adminService.GetPricingTiersAsync(cancellationToken);
            return Results.Ok(tiers);
        })
        .WithName("AdminGetPricingTiers")
        .WithSummary("Lấy danh sách các gói đăng ký");

        group.MapPut("/pricing/{id}", async (
            string id,
            UpdatePricingTierRequest request,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var updated = await adminService.UpdatePricingTierAsync(id, request, cancellationToken);
                return Results.Ok(updated);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("AdminUpdatePricingTier")
        .WithSummary("Cập nhật giá, số bài hát, % giảm giá, ẩn/hiện gói");

        group.MapPost("/pricing", async (
            CreatePricingTierRequest request,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var created = await adminService.CreatePricingTierAsync(request, cancellationToken);
            return Results.Ok(created);
        })
        .WithName("AdminCreatePricingTier")
        .WithSummary("Thêm gói đăng ký mới");

        group.MapDelete("/pricing/{id}", async (
            string id,
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var success = await adminService.DeletePricingTierAsync(id, cancellationToken);
            if (!success) return Results.NotFound();
            return Results.Ok(new { success = true });
        })
        .WithName("AdminDeletePricingTier")
        .WithSummary("Xóa gói đăng ký");

        return app;
    }
}
