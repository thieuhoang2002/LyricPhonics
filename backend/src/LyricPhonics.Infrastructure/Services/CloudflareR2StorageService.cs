using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LyricPhonics.Application.Interfaces;

namespace LyricPhonics.Infrastructure.Services;

/// <summary>
/// Dịch vụ lưu trữ file âm thanh trực tiếp trên Cloudflare R2 (S3-compatible API).
/// 
/// 💡 Ưu điểm của Cloudflare R2 so với AWS S3:
/// - 100% Zero Egress Fees (Không mất phí tải xuống/nghe nhạc).
/// - Tốc độ CDN toàn cầu siêu nhanh thông qua mạng Anycast của Cloudflare.
/// - Hoàn toàn tương thích giao thức AWS S3 SDK.
/// </summary>
public class CloudflareR2StorageService : IStorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<CloudflareR2StorageService> _logger;

    public CloudflareR2StorageService(
        IConfiguration configuration,
        ILogger<CloudflareR2StorageService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private string? GetSetting(string key, string envKey)
    {
        return _configuration[key] 
            ?? Environment.GetEnvironmentVariable(envKey) 
            ?? Environment.GetEnvironmentVariable(key.Replace(":", "__"));
    }

    public bool IsConfigured
    {
        get
        {
            var accountId = GetSetting("Cloudflare:R2:AccountId", "R2_ACCOUNT_ID");
            var accessKey = GetSetting("Cloudflare:R2:AccessKeyId", "R2_ACCESS_KEY_ID");
            var secretKey = GetSetting("Cloudflare:R2:SecretAccessKey", "R2_SECRET_ACCESS_KEY");
            return !string.IsNullOrWhiteSpace(accountId) 
                && !string.IsNullOrWhiteSpace(accessKey) 
                && !string.IsNullOrWhiteSpace(secretKey);
        }
    }

    private IAmazonS3? CreateS3Client()
    {
        var accountId = GetSetting("Cloudflare:R2:AccountId", "R2_ACCOUNT_ID");
        var accessKey = GetSetting("Cloudflare:R2:AccessKeyId", "R2_ACCESS_KEY_ID");
        var secretKey = GetSetting("Cloudflare:R2:SecretAccessKey", "R2_SECRET_ACCESS_KEY");

        if (string.IsNullOrWhiteSpace(accountId) || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
        {
            return null;
        }

        var credentials = new BasicAWSCredentials(accessKey, secretKey);
        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            AuthenticationRegion = "auto"
        };

        return new AmazonS3Client(credentials, config);
    }

    public async Task<(string? audioUrl, string? storageKey)> UploadAudioAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        Guid userId,
        Guid trackId,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            _logger.LogInformation("Cloudflare R2 chưa được cấu hình credentials. Bỏ qua việc lưu file nhạc lên Cloud.");
            return (null, null);
        }

        try
        {
            using var s3Client = CreateS3Client();
            if (s3Client == null) return (null, null);

            var bucketName = GetSetting("Cloudflare:R2:BucketName", "R2_BUCKET_NAME") ?? "lyricphonics-audio";
            var publicDomain = GetSetting("Cloudflare:R2:PublicDomain", "R2_PUBLIC_DOMAIN");

            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(extension)) extension = ".mp3";

            // Format object key: tracks/{userId}/{trackId}{extension}
            string storageKey = $"tracks/{userId}/{trackId}{extension}";

            var putRequest = new PutObjectRequest
            {
                BucketName = bucketName,
                Key = storageKey,
                InputStream = fileStream,
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "audio/mpeg" : contentType,
                DisablePayloadSigning = true
            };

            await s3Client.PutObjectAsync(putRequest, cancellationToken);
            _logger.LogInformation("Đã upload file âm thanh lên Cloudflare R2 thành công: {Key}", storageKey);

            string audioUrl;
            if (!string.IsNullOrWhiteSpace(publicDomain))
            {
                audioUrl = $"{publicDomain.TrimEnd('/')}/{storageKey}";
            }
            else
            {
                // Nếu không có public domain, tạo Presigned URL có thời hạn 7 ngày
                var presignedRequest = new GetPreSignedUrlRequest
                {
                    BucketName = bucketName,
                    Key = storageKey,
                    Expires = DateTime.UtcNow.AddDays(7)
                };
                audioUrl = s3Client.GetPreSignedURL(presignedRequest);
            }

            return (audioUrl, storageKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi upload file âm thanh lên Cloudflare R2 bucket.");
            return (null, null);
        }
    }

    public async Task<bool> DeleteAudioAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(storageKey)) return false;

        try
        {
            using var s3Client = CreateS3Client();
            if (s3Client == null) return false;

            var bucketName = GetSetting("Cloudflare:R2:BucketName", "R2_BUCKET_NAME") ?? "lyricphonics-audio";

            await s3Client.DeleteObjectAsync(new DeleteObjectRequest
            {
                BucketName = bucketName,
                Key = storageKey
            }, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa file âm thanh {Key} khỏi Cloudflare R2.", storageKey);
            return false;
        }
    }
}
