using LyricPhonics.Api.Endpoints;
using LyricPhonics.Api.Middleware;
using LyricPhonics.Application;
using LyricPhonics.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ====================================================================
// 1. CẤU HÌNH DEPENDENCY INJECTION (DI CONTAINER)
// ====================================================================

// Swagger / OpenAPI documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "LyricPhonics API (.NET 8 LTS)",
        Version = "v1",
        Description = "Hệ thống AI bóc tách lời bài hát 3 tầng và mốc thời gian chuẩn nhịp phục vụ hát cover."
    });
});

// Cấu hình CORS (Cross-Origin Resource Sharing) cho phép Frontend Next.js gọi sang
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "https://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Đăng ký dịch vụ tầng Application và Infrastructure theo Clean Architecture
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

var app = builder.Build();

// ====================================================================
// 2. CẤU HÌNH HTTP REQUEST PIPELINE (MIDDLEWARE)
// ====================================================================

// Middleware bắt và xử lý ngoại lệ toàn cục
app.UseMiddleware<GlobalExceptionMiddleware>();

// Kích hoạt Swagger UI trong môi trường Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LyricPhonics API v1");
        c.RoutePrefix = "swagger";
    });
}

// Kích hoạt CORS
app.UseCors("AllowFrontend");

// ====================================================================
// 3. ĐĂNG KÝ ENDPOINTS
// ====================================================================

// Health check endpoint
app.MapGet("/", () => Results.Ok(new
{
    name = "LyricPhonics API (.NET 8 LTS)",
    status = "Healthy",
    version = "v0.3.0",
    docs = "/swagger"
}))
.WithTags("Health")
.ExcludeFromDescription();

// Đăng ký các endpoints bóc tách âm thanh, tái tạo phiên âm, quản lý bài hát, xác thực và admin
app.MapTranscribeEndpoints();
app.MapPhonicsEndpoints();
app.MapTrackEndpoints();
app.MapAuthEndpoints();
app.MapAdminEndpoints();
app.MapPricingEndpoints();

// Tự động kiểm tra và khởi tạo bảng PostgreSQL (Neon DB) nếu đã cấu hình
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetService<LyricPhonics.Infrastructure.Persistence.LyricPhonicsDbContext>();
    if (dbContext != null)
    {
        try
        {
            await dbContext.Database.EnsureCreatedAsync();
            app.Logger.LogInformation("Đã kết nối thành công tới PostgreSQL (Neon DB) và đồng bộ cấu trúc bảng.");
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Chưa thể kết nối tới PostgreSQL (Neon DB). Ứng dụng vẫn hoạt động bình thường.");
        }
    }
}

app.Run();

// Hỗ trợ WebApplicationFactory trong Unit/Integration Tests
public partial class Program { }
