/**
 * src/types/lyrics.ts
 *
 * Core domain types and interfaces for LyricPhonics.
 * Strict typing enforcement: ZERO 'any' allowed as per AGENTS.md.
 */

/**
 * Interface representing a single synchronized lyric line with timing and phonetics.
 */
export interface LyricLine {
  /** Unique identifier for the lyric line (e.g. "line-1") */
  readonly id: string;
  /** Start time in seconds with millisecond precision (e.g. 12.45) */
  readonly startTime: number;
  /** End time in seconds with millisecond precision (e.g. 16.20) */
  readonly endTime: number;
  /** Original song lyrics in native language/script (Chinese, Japanese, Korean, English, etc.) */
  readonly originalText: string;
  /** Rhythm-matched Vietnamese phonetic transcription (phiên âm bồi chuẩn nhịp để hát cover) */
  readonly phoneticText: string;
  /** Concise Vietnamese meaning/translation of the lyric line */
  readonly translationText: string;
}

/**
 * Metadata associated with an audio/song transcription.
 */
export interface TranscriptionMetadata {
  /** Title of the song if identified */
  readonly title?: string;
  /** Artist, singer, or band name if identified */
  readonly artist?: string;
  /** Album name if detected */
  readonly album?: string;
  /** Author or creator */
  readonly author?: string;
  readonly creator?: string;
  /** Detected primary language of the lyrics (e.g. "zh", "ja", "ko", "en") */
  readonly detectedLanguage?: string;
  /** Total duration of the audio track in seconds */
  readonly duration?: number;
  readonly offset?: number;
  readonly length?: string;
}

/**
 * Complete result returned from Gemini Multimodal Audio transcription and phonetic generation.
 */
export interface TranscriptionResult {
  /** Metadata describing the transcribed audio track */
  readonly metadata: TranscriptionMetadata;
  /** Chronologically sorted list of synchronized lyric lines (ordered by startTime) */
  readonly lines: readonly LyricLine[];
}

/**
 * Server API response payload structure
 */
export interface TranscriptionResponse {
  readonly success: boolean;
  readonly metadata?: TranscriptionMetadata;
  readonly lines: readonly LyricLine[];
  readonly error?: string;
}

/**
 * Supported export formats for synchronized lyrics and phonetics.
 */
export type ExportFormat = 'txt' | 'lrc' | 'srt' | 'json' | 'clipboard';

/**
 * Safe Type Guard: checks if an unknown value conforms to LyricLine without using 'any'.
 */
export function isLyricLine(value: unknown): value is LyricLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.startTime === 'number' &&
    !Number.isNaN(record.startTime) &&
    typeof record.endTime === 'number' &&
    !Number.isNaN(record.endTime) &&
    typeof record.originalText === 'string' &&
    typeof record.phoneticText === 'string' &&
    typeof record.translationText === 'string'
  );
}

/**
 * Safe Type Guard: checks if an unknown value conforms to TranscriptionResult.
 */
export function isTranscriptionResult(value: unknown): value is TranscriptionResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.metadata !== 'object' || record.metadata === null) {
    return false;
  }

  if (!Array.isArray(record.lines)) {
    return false;
  }

  return record.lines.every(isLyricLine);
}
