import { z } from 'zod';
import type { LyricLine, TranscriptionMetadata, TranscriptionResult } from '@/types/lyrics';

/**
 * Zod Schema for a single synchronized lyric line.
 */
export const lyricLineSchema = z.object({
  id: z.string().optional().default(''),
  startTime: z.number().min(0, 'Start time must be >= 0'),
  endTime: z.number().min(0, 'End time must be >= 0'),
  originalText: z.string().min(1, 'Original text cannot be empty'),
  phoneticText: z.string().min(1, 'Phonetic text cannot be empty'),
  translationText: z.string().optional().default(''),
});

/**
 * Zod Schema for transcription metadata.
 */
export const transcriptionMetadataSchema = z.object({
  title: z.string().optional().default(''),
  artist: z.string().optional().default(''),
  detectedLanguage: z.string().optional().default('unknown'),
  duration: z.number().min(0).optional(),
});

/**
 * Zod Schema for the full transcription result.
 */
export const transcriptionResultSchema = z.object({
  metadata: transcriptionMetadataSchema.optional().default({}),
  lines: z.array(lyricLineSchema),
});

/**
 * Gemini Structured Outputs JSON Schema.
 * Passed directly to @google/genai responseSchema config.
 */
export const geminiLyricsResponseSchema = {
  type: 'object',
  properties: {
    metadata: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        artist: { type: 'string' },
        detectedLanguage: { type: 'string' },
      },
    },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          startTime: {
            type: 'number',
            description: 'Start timestamp of this line in seconds (float)',
          },
          endTime: {
            type: 'number',
            description: 'End timestamp of this line in seconds (float)',
          },
          originalText: {
            type: 'string',
            description: 'Original lyrics in native language/script',
          },
          phoneticText: {
            type: 'string',
            description: 'Natural Vietnamese phonetic transcription matching rhythm and tone (lời bồi chuẩn nhịp)',
          },
          translationText: {
            type: 'string',
            description: 'Brief Vietnamese translation/meaning',
          },
        },
        required: ['startTime', 'endTime', 'originalText', 'phoneticText', 'translationText'],
      },
    },
  },
  required: ['lines'],
} as const;

/**
 * Safe runtime validation helper: strictly validates unknown data into TranscriptionResult.
 */
export function validateTranscriptionResult(data: unknown): TranscriptionResult {
  const parsed = transcriptionResultSchema.parse(data);
  const lines: LyricLine[] = parsed.lines.map((item, index) => ({
    id: item.id || `line-${index + 1}`,
    startTime: Number(item.startTime.toFixed(2)),
    endTime: Number(item.endTime.toFixed(2)),
    originalText: item.originalText.trim(),
    phoneticText: item.phoneticText.trim(),
    translationText: (item.translationText || '').trim(),
  }));

  const metadata: TranscriptionMetadata = {
    title: parsed.metadata?.title || '',
    artist: parsed.metadata?.artist || '',
    detectedLanguage: parsed.metadata?.detectedLanguage || 'unknown',
    duration: parsed.metadata?.duration,
  };

  return {
    metadata,
    lines,
  };
}
