using LyricPhonics.Api.Endpoints;
using LyricPhonics.Api.Middleware;
using LyricPhonics.Application;
using LyricPhonics.Infrastructure;
using Microsoft.EntityFrameworkCore;

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
        policy.SetIsOriginAllowed(_ => true)
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

app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow
}))
.WithTags("Health")
.WithSummary("Kiểm tra trạng thái hoạt động (Health check ping)");

// Đăng ký các endpoints bóc tách âm thanh, tái tạo phiên âm, quản lý bài hát, xác thực, piano và admin
app.MapTranscribeEndpoints();
app.MapPhonicsEndpoints();
app.MapTrackEndpoints();
app.MapAuthEndpoints();
app.MapAdminEndpoints();
app.MapPricingEndpoints();
app.MapPianoEndpoints();

// Tự động kiểm tra và khởi tạo bảng PostgreSQL (Neon DB) nếu đã cấu hình
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetService<LyricPhonics.Infrastructure.Persistence.LyricPhonicsDbContext>();
    if (dbContext != null)
    {
        try
        {
            await dbContext.Database.EnsureCreatedAsync();

            const string initSql = @"
CREATE TABLE IF NOT EXISTS tracks (
    ""Id"" UUID PRIMARY KEY,
    ""Title"" VARCHAR(255) NOT NULL,
    ""Artist"" VARCHAR(255),
    ""FileName"" VARCHAR(500),
    ""DetectedLanguage"" VARCHAR(50),
    ""TargetLanguage"" VARCHAR(50),
    ""Duration"" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ""UserId"" UUID,
    ""AudioUrl"" VARCHAR(1000),
    ""AudioStorageKey"" VARCHAR(500),
    ""LinesJson"" jsonb,
    ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    ""Id"" UUID PRIMARY KEY,
    ""Email"" VARCHAR(255) UNIQUE NOT NULL,
    ""PasswordHash"" TEXT NOT NULL,
    ""RegistrationIp"" VARCHAR(100),
    ""SongCredits"" INT NOT NULL DEFAULT 2,
    ""TotalSongsCreated"" INT NOT NULL DEFAULT 0,
    ""IsAdmin"" BOOLEAN NOT NULL DEFAULT FALSE,
    ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ""LastLoginAt"" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS api_keys (
    ""Id"" UUID PRIMARY KEY,
    ""Provider"" VARCHAR(50) NOT NULL,
    ""KeyValue"" TEXT NOT NULL,
    ""Status"" VARCHAR(50) NOT NULL DEFAULT 'Healthy',
    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
    ""LatencyMs"" BIGINT,
    ""LastCheckedAt"" TIMESTAMP WITH TIME ZONE,
    ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_tiers' AND column_name='Id' AND data_type='uuid') THEN
        DROP TABLE pricing_tiers CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS pricing_tiers (
    ""Id"" VARCHAR(50) PRIMARY KEY,
    ""Name"" VARCHAR(100) NOT NULL,
    ""PriceUsd"" NUMERIC(10,2) NOT NULL,
    ""SongCount"" INT NOT NULL,
    ""DiscountPercent"" INT NOT NULL DEFAULT 0,
    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
    ""SortOrder"" INT NOT NULL DEFAULT 0,
    ""FeaturesJson"" TEXT DEFAULT '[]',
    ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_securities (
    ""Id"" UUID PRIMARY KEY,
    ""Ciphertext"" TEXT NOT NULL,
    ""Salt"" TEXT NOT NULL,
    ""Iv"" TEXT NOT NULL,
    ""Tag"" TEXT NOT NULL,
    ""Hint"" VARCHAR(500),
    ""UpdatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracks' AND column_name='AudioUrl') THEN
        ALTER TABLE tracks ADD COLUMN ""AudioUrl"" VARCHAR(1000);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracks' AND column_name='AudioStorageKey') THEN
        ALTER TABLE tracks ADD COLUMN ""AudioStorageKey"" VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracks' AND column_name='UserId') THEN
        ALTER TABLE tracks ADD COLUMN ""UserId"" UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracks' AND column_name='TargetLanguage') THEN
        ALTER TABLE tracks ADD COLUMN ""TargetLanguage"" VARCHAR(50) DEFAULT 'vi';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='IsActive') THEN
        ALTER TABLE api_keys ADD COLUMN ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='LatencyMs') THEN
        ALTER TABLE api_keys ADD COLUMN ""LatencyMs"" BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='LastCheckedAt') THEN
        ALTER TABLE api_keys ADD COLUMN ""LastCheckedAt"" TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='Status') THEN
        ALTER TABLE api_keys ADD COLUMN ""Status"" VARCHAR(50) NOT NULL DEFAULT 'Healthy';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_tiers' AND column_name='SortOrder') THEN
        ALTER TABLE pricing_tiers ADD COLUMN ""SortOrder"" INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_tiers' AND column_name='FeaturesJson') THEN
        ALTER TABLE pricing_tiers ADD COLUMN ""FeaturesJson"" TEXT DEFAULT '[]';
    END IF;
END $$;
";
            await dbContext.Database.ExecuteSqlRawAsync(initSql);
            app.Logger.LogInformation("Đã kết nối thành công tới PostgreSQL (Neon DB) và đồng bộ đầy đủ cấu trúc 5 bảng.");
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
