using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using LyricPhonics.Application.Interfaces;

namespace LyricPhonics.Api.Endpoints;

public static class PricingEndpoints
{
    public static IEndpointRouteBuilder MapPricingEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/pricing", async (
            IAdminService adminService,
            CancellationToken cancellationToken) =>
        {
            var tiers = await adminService.GetPricingTiersAsync(cancellationToken);
            var activeTiers = tiers.FindAll(t => t.IsActive);
            return Results.Ok(activeTiers);
        })
        .WithTags("Pricing")
        .WithName("GetPublicPricing")
        .WithSummary("Lấy danh sách các gói nạp lượt bài hát đang kích hoạt");

        return app;
    }
}
