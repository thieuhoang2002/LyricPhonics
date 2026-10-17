namespace LyricPhonics.Infrastructure.Gemini;

/// <summary>
/// Lớp cấu hình tùy chọn cho dịch vụ Google Gemini API.
/// 
/// 💡 Thiết kế kỹ thuật (Options Pattern):
/// - Sử dụng Options Pattern (IOptions<GeminiOptions>) là quy chuẩn vàng trong .NET để
///   ánh xạ trực tiếp từ file cấu hình (appsettings.json hoặc Environment Variables)
///   vào một đối tượng C# định kiểu mạnh.
/// - Giúp code dễ bảo trì, dễ test, và không bị rải rác các lệnh đọc string config khắp nơi.
/// </summary>
public class GeminiOptions
{
    public const string SectionName = "Gemini";

    /// <summary>
    /// Google Gemini API Key bí mật.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Model Gemini xử lý âm thanh chính (mặc định: gemini-3.5-flash).
    /// </summary>
    public string Model { get; set; } = "gemini-3.5-flash";

    /// <summary>
    /// Model Gemini dự phòng khi model chính quá tải (mặc định: gemini-3.8-flash).
    /// </summary>
    public string FallbackModel { get; set; } = "gemini-3.8-flash";

    /// <summary>
    /// Địa chỉ Base URL của Google Gemini REST API.
    /// </summary>
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
}
