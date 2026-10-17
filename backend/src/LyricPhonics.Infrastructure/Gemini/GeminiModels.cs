using System.Text.Json.Serialization;

namespace LyricPhonics.Infrastructure.Gemini;

/// <summary>
/// Các đối tượng DTO định dạng JSON gửi đi và nhận về từ Google Gemini REST API.
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (System.Text.Json & Source Generation Ready):
/// - Dùng C# 12 'record' kết hợp thuộc tính '[JsonPropertyName]' để ánh xạ chính xác
///   cú pháp camelCase của Google API sang PascalCase chuẩn của C#.
/// - Không tốn chi phí cấp phát bộ nhớ thừa.
/// </summary>

public record GeminiGenerateContentRequest(
    [property: JsonPropertyName("contents")] List<GeminiContent> Contents,
    [property: JsonPropertyName("systemInstruction")] GeminiSystemInstruction? SystemInstruction = null,
    [property: JsonPropertyName("generationConfig")] GeminiGenerationConfig? GenerationConfig = null
);

public record GeminiContent(
    [property: JsonPropertyName("parts")] List<GeminiPart> Parts,
    [property: JsonPropertyName("role")] string? Role = "user"
);

public record GeminiSystemInstruction(
    [property: JsonPropertyName("parts")] List<GeminiTextPart> Parts
);

public record GeminiTextPart(
    [property: JsonPropertyName("text")] string Text
);

public record GeminiPart(
    [property: JsonPropertyName("text")] string? Text = null,
    [property: JsonPropertyName("inlineData")] GeminiInlineData? InlineData = null
);

public record GeminiInlineData(
    [property: JsonPropertyName("mimeType")] string MimeType,
    [property: JsonPropertyName("data")] string Data
);

public record GeminiGenerationConfig(
    [property: JsonPropertyName("responseMimeType")] string ResponseMimeType = "application/json",
    [property: JsonPropertyName("temperature")] double Temperature = 0.2
);

public record GeminiGenerateContentResponse(
    [property: JsonPropertyName("candidates")] List<GeminiCandidate>? Candidates = null,
    [property: JsonPropertyName("error")] GeminiErrorDetail? Error = null
);

public record GeminiCandidate(
    [property: JsonPropertyName("content")] GeminiContent? Content = null
);

public record GeminiErrorDetail(
    [property: JsonPropertyName("code")] int Code,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("status")] string Status
);

/// <summary>
/// Cấu trúc JSON bên trong câu trả lời văn bản của Gemini khi bóc tách lời bài hát.
/// </summary>
public record GeminiTranscriptionOutput(
    [property: JsonPropertyName("metadata")] GeminiOutputMetadata? Metadata,
    [property: JsonPropertyName("lines")] List<GeminiOutputLine>? Lines
);

public record GeminiOutputMetadata(
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("artist")] string? Artist,
    [property: JsonPropertyName("detectedLanguage")] string? DetectedLanguage
);

public record GeminiOutputLine(
    [property: JsonPropertyName("startTime")] double StartTime,
    [property: JsonPropertyName("endTime")] double EndTime,
    [property: JsonPropertyName("originalText")] string OriginalText,
    [property: JsonPropertyName("phoneticText")] string PhoneticText,
    [property: JsonPropertyName("translationText")] string? TranslationText
);
