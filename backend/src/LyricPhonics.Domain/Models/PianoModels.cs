using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LyricPhonics.Domain.Models;

/// <summary>
/// Đại diện cho một nốt nhạc trong bản chơi Piano (Synthesia / Falling Notes).
/// </summary>
public record PianoNoteEvent(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("midi")] int Midi,
    [property: JsonPropertyName("noteName")] string NoteName,
    [property: JsonPropertyName("startTime")] double StartTime,
    [property: JsonPropertyName("duration")] double Duration,
    [property: JsonPropertyName("velocity")] int Velocity = 80,
    [property: JsonPropertyName("hand")] int Hand = 0,        // 0: Phải (Melody/Lead), 1: Trái (Bass/Accompaniment)
    [property: JsonPropertyName("finger")] int Finger = 0     // Gợi ý ngón tay (1: Cái, 2: Trỏ, 3: Giữa, 4: Áp út, 5: Út)
);

/// <summary>
/// Đại diện cho một hợp âm tại một khoảng thời gian trong bài nhạc.
/// </summary>
public record PianoChordSegment(
    [property: JsonPropertyName("chord")] string Chord,
    [property: JsonPropertyName("startTime")] double StartTime,
    [property: JsonPropertyName("endTime")] double EndTime
);

/// <summary>
/// Đại diện cho một phân đoạn bài hát (Intro, Verse, Chorus, Outro...).
/// </summary>
public record PianoSectionSegment(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("startTime")] double StartTime,
    [property: JsonPropertyName("endTime")] double EndTime
);

/// <summary>
/// Kết quả phân tích và chuyển đổi âm thanh sang bản Piano hoàn chỉnh.
/// </summary>
public record PianoTranscriptionResult(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("artist")] string Artist,
    [property: JsonPropertyName("keySignature")] string KeySignature,
    [property: JsonPropertyName("bpm")] int Bpm,
    [property: JsonPropertyName("duration")] double Duration,
    [property: JsonPropertyName("sections")] List<PianoSectionSegment> Sections,
    [property: JsonPropertyName("chords")] List<PianoChordSegment> Chords,
    [property: JsonPropertyName("notes")] List<PianoNoteEvent> Notes
);
