using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Hợp đồng (Interface) cho dịch vụ bóc tách lời bài hát bằng AI.
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (SOLID - Dependency Inversion Principle):
/// - Tầng Application định nghĩa Interface này nhưng KHÔNG quan tâm bên dưới dùng Gemini, OpenAI hay Whisper.
/// - Tầng Infrastructure sẽ chịu trách nhiệm triển khai cụ thể (Implementation).
/// - Giúp dễ dàng viết Unit Test (bằng Moq) mà không phải gọi API AI thật tốn tiền/quota.
/// </summary>
public interface ITranscriptionService
{
    /// <summary>
    /// Bóc tách âm thanh từ luồng dữ liệu Stream sang định dạng lời bài hát 3 tầng có timestamp.
    /// </summary>
    /// <param name="audioStream">Luồng dữ liệu file âm thanh (dùng Stream thay vì byte[] để tiết kiệm RAM).</param>
    /// <param name="mimeType">Định dạng file (audio/mpeg, audio/wav, video/mp4...).</param>
    /// <param name="fileName">Tên file tải lên để trích xuất tên bài hát mặc định.</param>
    /// <param name="cancellationToken">Token hỗ trợ hủy tác vụ khi người dùng ngắt kết nối HTTP.</param>
    /// <returns>Đối tượng TranscriptionResult chứa danh sách câu hát và metadata.</returns>
    Task<TranscriptionResult> TranscribeAudioAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
        CancellationToken cancellationToken = default
    );
}
