import type { LyricLine, TranscriptionMetadata } from '@/types/lyrics';
import { formatSecondsToLrc, parseLrcTimestamp } from '@/lib/utils/time';

/**
 * Generates standard LRC Karaoke file content with metadata tags and line timestamps.
 * Standard format:
 * [ti:Title]
 * [ar:Artist]
 * [al:Album]
 * [by:LyricPhonics]
 * [mm:ss.xx]Original Text (Phonetic Text)
 */
export function generateLrcContent(
  lines: readonly LyricLine[],
  metadata?: TranscriptionMetadata
): string {
  const outputLines: string[] = [];

  if (metadata) {
    if (metadata.title) outputLines.push(`[ti:${metadata.title}]`);
    if (metadata.artist) outputLines.push(`[ar:${metadata.artist}]`);
    if (metadata.album) outputLines.push(`[al:${metadata.album}]`);
    if (metadata.author) outputLines.push(`[au:${metadata.author}]`);
    if (metadata.creator) {
      outputLines.push(`[by:${metadata.creator}]`);
    } else {
      outputLines.push('[by:LyricPhonics]');
    }
    if (metadata.offset !== undefined) outputLines.push(`[offset:${metadata.offset}]`);
    if (metadata.length) outputLines.push(`[length:${metadata.length}]`);
  }

  for (const line of lines) {
    const tag = formatSecondsToLrc(line.startTime);
    let textContent = line.originalText.trim();
    if (line.phoneticText && line.phoneticText.trim().length > 0) {
      textContent = `${textContent} (${line.phoneticText.trim()})`;
    }
    outputLines.push(`${tag}${textContent}`);
  }

  return outputLines.join('\n');
}

/**
 * Parses standard LRC text back into LyricLine objects.
 * Automatically computes endTime based on next line's startTime or default duration (3.0s).
 */
export function parseLrcContent(lrcString: string): LyricLine[] {
  if (typeof lrcString !== 'string' || lrcString.trim().length === 0) {
    return [];
  }

  const rawLines = lrcString.split(/\r?\n/);
  const parsedItems: { startTime: number; originalText: string; phoneticText: string }[] = [];

  const timestampRegex = /^\[(\d{1,2}:\d{1,2}(?:\.\d{1,3})?)\](.*)$/;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('[ti:') || trimmed.startsWith('[ar:') ||
        trimmed.startsWith('[al:') || trimmed.startsWith('[by:') ||
        trimmed.startsWith('[offset:') || trimmed.startsWith('[length:')) {
      continue;
    }

    const match = trimmed.match(timestampRegex);
    if (!match) continue;

    const timeTag = match[1];
    const content = match[2].trim();
    const startTime = parseLrcTimestamp(timeTag);

    // Parse "Original Text (Phonetic Text)" pattern
    const phoneticMatch = content.match(/^(.*?)\s*\((.*?)\)$/);
    let originalText = content;
    let phoneticText = '';

    if (phoneticMatch) {
      originalText = phoneticMatch[1].trim();
      phoneticText = phoneticMatch[2].trim();
    }

    parsedItems.push({
      startTime,
      originalText,
      phoneticText,
    });
  }

  // Sort by startTime
  parsedItems.sort((a, b) => a.startTime - b.startTime);

  // Convert to LyricLine with endTime and unique id
  const result: LyricLine[] = [];
  const defaultLineDuration = 3.0;

  for (let i = 0; i < parsedItems.length; i++) {
    const current = parsedItems[i];
    const next = parsedItems[i + 1];
    const endTime = next ? next.startTime : Number.parseFloat((current.startTime + defaultLineDuration).toFixed(2));

    result.push({
      id: `line-${i + 1}`,
      startTime: current.startTime,
      endTime: Math.max(current.startTime, endTime),
      originalText: current.originalText,
      phoneticText: current.phoneticText,
      translationText: '',
    });
  }

  return result;
}
