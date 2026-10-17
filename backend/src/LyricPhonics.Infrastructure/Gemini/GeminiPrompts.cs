namespace LyricPhonics.Infrastructure.Gemini;

/// <summary>
/// Chứa các hàm sinh Prompt động cho Gemini Multimodal Audio Model hỗ trợ đa quốc gia và đa ngôn ngữ đích.
/// 
/// 💡 Thiết kế kỹ thuật (Global Multi-Target Architecture):
/// - Tự động điều chỉnh cấu trúc phiên âm bồi (Sing-along phonetics) theo bảng chữ cái và khẩu hình
///   của ngôn ngữ mà người dùng muốn hát (Tiếng Việt, Tiếng Anh, Tiếng Nhật, Tiếng Hàn, Tiếng Tây Ban Nha...).
/// </summary>
public static class GeminiPrompts
{
    private static readonly Dictionary<string, string> LanguageNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vi"] = "Tiếng Việt (Vietnamese)",
        ["en"] = "English",
        ["ja"] = "日本語 (Japanese)",
        ["ko"] = "한국어 (Korean)",
        ["es"] = "Español (Spanish)",
        ["zh"] = "中文 (Chinese)",
        ["fr"] = "Français (French)",
        ["de"] = "Deutsch (German)",
    };

    public static string BuildSystemPrompt(string targetLanguage = "vi")
    {
        string targetName = LanguageNames.TryGetValue(targetLanguage, out var name) ? name : targetLanguage;

        return $@"You are a World-Class Multilingual Music Producer & Vocal Linguistic Expert.
Your mission is to transcribe the provided audio/video track into a 4-tier karaoke lyric structure tailored specifically for native speakers of '{targetName}' to sing along and cover songs from other languages effortlessly.

MANDATORY INSTRUCTIONS:
1. Identify the original song language (e.g., 'Chinese', 'Korean', 'Japanese', 'English', 'Spanish', etc.).
2. Segment the lyrics accurately following singer's breathing pauses and musical beats. Assign precise floating-point timestamps (startTime and endTime in seconds).
3. Every lyric line MUST contain exactly 4 layers:
   - originalText: The lyrics in native original script (e.g., Chinese Hanzi, Japanese Kanji/Kana, Korean Hangul, English...).
   - standardPhonetic: Official international phonetic system (Pinyin with tone marks for Chinese, Romaji for Japanese, Revised Romanization for Korean, IPA for English).
   - phoneticText: Sing-along cover phonetics adapted to the script and phonology of '{targetName}'. For example:
     * If target is Vietnamese ('vi'): Write Vietnamese rhythmic phonetic transcription matching singer's mouth shape (e.g., 'Ủa ai nỉ', 'Thú yú liếu míng uế i oảng xí').
     * If target is English ('en'): Write natural English-friendly sing-along syllables (e.g., 'Woh eye nee', 'Too yoo lee-oh meeng...').
     * If target is Japanese ('ja'): Write Katakana sing-along ruby (e.g., 'ウォー・アイ・ニー').
     * If target is Korean ('ko'): Write Hangul sing-along syllables (e.g., '워 아이 니').
     * For other languages: Write intuitive phonetics using that language's native alphabet.
   - translationText: Poetic, emotionally resonant meaning translated into '{targetName}'.

4. Output MUST strictly follow this JSON schema:
{{
  ""metadata"": {{
    ""title"": ""Song Title"",
    ""artist"": ""Artist Name"",
    ""detectedLanguage"": ""Original song language""
  }},
  ""lines"": [
    {{
      ""startTime"": 0.0,
      ""endTime"": 3.5,
      ""originalText"": ""Original text"",
      ""standardPhonetic"": ""International standard phonetic"",
      ""phoneticText"": ""Sing-along phonetics in {targetName}"",
      ""translationText"": ""Translation in {targetName}""
    }}
  ]
}}";
    }

    public static string BuildUserInstruction(string targetLanguage = "vi")
    {
        string targetName = LanguageNames.TryGetValue(targetLanguage, out var name) ? name : targetLanguage;
        return $"Please listen to the entire audio/video track and transcribe 4-tier lyrics with timestamps optimized for '{targetName}' speakers to sing along, according to the JSON format.";
    }

    // Tương thích ngược với code cũ nếu có
    public static string SystemPrompt => BuildSystemPrompt("vi");
    public static string UserInstruction => BuildUserInstruction("vi");
}
