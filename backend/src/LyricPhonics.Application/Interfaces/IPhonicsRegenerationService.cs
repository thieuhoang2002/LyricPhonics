namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Kết quả tái tạo phiên âm 4 tầng khi người dùng chỉnh sửa lời gốc.
/// </summary>
public record RegeneratedPhonicsResult(
    string OriginalText,
    string StandardPhonetic,
    string PhoneticText,
    string TranslationText
);

/// <summary>
/// Dịch vụ tái tạo phiên âm và dịch nghĩa tức thì sử dụng Groq AI LPU / Gemini.
/// </summary>
public interface IPhonicsRegenerationService
{
    Task<RegeneratedPhonicsResult> RegenerateLinePhonicsAsync(
        string originalText,
        string? language = null,
        CancellationToken cancellationToken = default
    );
}
