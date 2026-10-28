using System.IO;
using System.Threading;
using System.Threading.Tasks;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Hợp đồng dịch vụ phân tích âm thanh và chuyển đổi sang bản hòa âm Piano MIDI đa bè.
/// 
/// 💡 Thiết kế kỹ thuật (Clean Architecture):
/// - Tầng Application chỉ định nghĩa Interface, không phụ thuộc vào công nghệ AI cụ thể (Gemini, Magenta, v.v.).
/// - Xử lý stream trực tiếp để tiết kiệm bộ nhớ RAM.
/// </summary>
public interface IPianoTranscriptionService
{
    /// <summary>
    /// Chuyển đổi tệp âm thanh (MP3, WAV, M4A) thành bản Piano hoàn chỉnh (Nốt, Hợp âm, Phân đoạn).
    /// </summary>
    /// <param name="audioStream">Luồng dữ liệu file âm thanh (đọc trực tiếp dạng Stream).</param>
    /// <param name="mimeType">Định dạng file (audio/mpeg, audio/wav, audio/x-m4a...).</param>
    /// <param name="fileName">Tên file tải lên.</param>
    /// <param name="cancellationToken">Token hỗ trợ hủy tác vụ.</param>
    /// <returns>Đối tượng PianoTranscriptionResult chứa nốt, hợp âm, nhịp độ và cấu trúc bài.</returns>
    Task<PianoTranscriptionResult> TranscribePianoAsync(
        Stream audioStream,
        string mimeType,
        string fileName,
        CancellationToken cancellationToken = default
    );
}
