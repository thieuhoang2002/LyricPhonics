using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Domain.Models;

namespace LyricPhonics.Application.Services;

/// <summary>
/// Dịch vụ xử lý định dạng file Karaoke LRC (.lrc).
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (Performance & String Optimization):
/// - Sử dụng 'StringBuilder' khi ghép chuỗi file lớn thay vì cộng chuỗi '+' để tránh sinh ra
///   hàng nghìn chuỗi rác trên Heap (tránh Garbage Collection pressure).
/// - Định dạng thời gian theo chuẩn bất biến (CultureInfo.InvariantCulture) để đảm bảo dấu thập
///   phân luôn là dấu chấm '.', không bị biến thành dấu phẩy ',' trên máy chủ Châu Âu/Việt Nam.
/// </summary>
public class LrcService : ILrcService
{
    // Regex tối ưu nhận diện mốc thời gian LRC: [mm:ss.xx] hoặc [mm:ss:xx]
    private static readonly Regex LrcTimeRegex = new(
        @"^\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    public string GenerateLrc(TranscriptionResult result)
    {
        if (result == null)
        {
            throw new ArgumentNullException(nameof(result));
        }

        var sb = new StringBuilder();

        // 1. Ghi thẻ Metadata đầu file LRC
        if (!string.IsNullOrWhiteSpace(result.Metadata.Title))
        {
            sb.AppendLine($"[ti:{result.Metadata.Title}]");
        }

        if (!string.IsNullOrWhiteSpace(result.Metadata.Artist))
        {
            sb.AppendLine($"[ar:{result.Metadata.Artist}]");
        }

        sb.AppendLine("[al:LyricPhonics AI Cover]");
        sb.AppendLine("[by:LyricPhonics .NET 8]");

        // 2. Ghi từng dòng lời kèm timestamp chuẩn [mm:ss.xx]
        foreach (var line in result.Lines)
        {
            string timestamp = FormatSecondsToLrc(line.StartTime);

            // Cấu trúc dòng: [mm:ss.xx] Lời gốc (Phiên âm tiếng Việt bồi)
            if (!string.IsNullOrWhiteSpace(line.PhoneticText) && line.PhoneticText != line.OriginalText)
            {
                sb.AppendLine($"{timestamp}{line.OriginalText} ({line.PhoneticText})");
            }
            else
            {
                sb.AppendLine($"{timestamp}{line.OriginalText}");
            }
        }

        return sb.ToString();
    }

    public IReadOnlyList<LyricLine> ParseLrc(string lrcContent)
    {
        if (string.IsNullOrWhiteSpace(lrcContent))
        {
            return Array.Empty<LyricLine>();
        }

        var lines = new List<LyricLine>();
        using var reader = new StringReader(lrcContent);
        string? lineText;
        int lineCounter = 1;

        while ((lineText = reader.ReadLine()) != null)
        {
            lineText = lineText.Trim();
            if (string.IsNullOrWhiteSpace(lineText)) continue;

            var match = LrcTimeRegex.Match(lineText);
            if (!match.Success)
            {
                continue; // Bỏ qua thẻ metadata [ti:...], [ar:...]
            }

            int minutes = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
            int seconds = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
            string subSecondsStr = match.Groups[3].Value;
            double subSeconds = double.Parse(subSecondsStr, CultureInfo.InvariantCulture) / (subSecondsStr.Length == 3 ? 1000.0 : 100.0);

            double startTime = (minutes * 60) + seconds + subSeconds;
            string text = match.Groups[4].Value.Trim();

            string originalText = text;
            string phoneticText = text;

            // Kiểm tra xem dòng có định dạng: "Chữ gốc (Phiên âm)" không
            int parenOpen = text.LastIndexOf('(');
            int parenClose = text.LastIndexOf(')');
            if (parenOpen > 0 && parenClose == text.Length - 1 && parenClose > parenOpen)
            {
                originalText = text.Substring(0, parenOpen).Trim();
                phoneticText = text.Substring(parenOpen + 1, parenClose - parenOpen - 1).Trim();
            }

            // Ước lượng EndTime mặc định là StartTime + 3 giây nếu chưa có dòng kế tiếp
            double estimatedEndTime = startTime + 3.0;

            lines.Add(new LyricLine(
                Id: $"lrc-{lineCounter++}",
                StartTime: startTime,
                EndTime: estimatedEndTime,
                OriginalText: originalText,
                PhoneticText: phoneticText
            ));
        }

        // Tinh chỉnh EndTime của câu trước khớp với StartTime của câu tiếp theo
        for (int i = 0; i < lines.Count - 1; i++)
        {
            if (lines[i].EndTime > lines[i + 1].StartTime)
            {
                lines[i] = lines[i] with { EndTime = lines[i + 1].StartTime };
            }
        }

        return lines;
    }

    /// <summary>
    /// Chuyển đổi số giây thực sang định dạng chuỗi [mm:ss.xx] chuẩn LRC.
    /// </summary>
    public static string FormatSecondsToLrc(double totalSeconds)
    {
        if (totalSeconds < 0) totalSeconds = 0;

        int minutes = (int)(totalSeconds / 60);
        double remainingSeconds = totalSeconds - (minutes * 60);
        int seconds = (int)remainingSeconds;
        int hundredths = (int)Math.Round((remainingSeconds - seconds) * 100);

        if (hundredths >= 100)
        {
            seconds++;
            hundredths = 0;
        }

        if (seconds >= 60)
        {
            minutes++;
            seconds = 0;
        }

        return $"[{minutes:D2}:{seconds:D2}.{hundredths:D2}]";
    }
}
