using System.Net;
using System.Text.Json;

namespace LyricPhonics.Api.Middleware;

/// <summary>
/// Middleware xử lý ngoại lệ toàn cục (Global Exception Handler).
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (ASP.NET Core Middleware Pipeline):
/// - Đứng ở đầu HTTP Pipeline để bắt mọi lỗi phát sinh từ các tầng bên trong (Controller, Service, Repository).
/// - Đảm bảo API luôn trả về cấu trúc lỗi JSON nhất quán (theo chuẩn RFC 7807 Problem Details).
/// - Tuyệt đối không để lộ StackTrace ra ngoài môi trường Production (Bảo mật).
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate _next, ILogger<GlobalExceptionMiddleware> logger)
    {
        this._next = _next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Đã xảy ra lỗi chưa được xử lý trong HTTP Request: {Path}", context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            ArgumentException argEx => (HttpStatusCode.BadRequest, argEx.Message),
            InvalidOperationException opEx => (HttpStatusCode.BadRequest, opEx.Message),
            FormatException fmtEx => (HttpStatusCode.UnprocessableEntity, fmtEx.Message),
            HttpRequestException httpEx => (HttpStatusCode.BadGateway, "Lỗi kết nối tới máy chủ AI bên ngoài."),
            _ => (HttpStatusCode.InternalServerError, "Máy chủ đã gặp sự cố nội bộ. Vui lòng thử lại sau.")
        };

        context.Response.StatusCode = (int)statusCode;

        var errorResponse = new
        {
            success = false,
            error = message,
            statusCode = (int)statusCode,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(errorResponse);
        await context.Response.WriteAsync(json);
    }
}
