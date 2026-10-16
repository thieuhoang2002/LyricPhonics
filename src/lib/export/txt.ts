import type { LyricLine, TranscriptionMetadata } from '@/types/lyrics';

/**
 * Formats synchronized lyrics into a clean, human-readable plain text file (.txt)
 * suitable for printing, reading, or singing on mobile devices.
 */
export function exportToTxt(
  lines: readonly LyricLine[],
  metadata?: TranscriptionMetadata
): string {
  const parts: string[] = [];

  // Metadata Header
  if (metadata?.title || metadata?.artist) {
    const title = metadata.title || 'Bài hát chưa đặt tên';
    const artist = metadata.artist || 'Nghệ sĩ chưa rõ';
    parts.push(`=== ${title} - ${artist} ===`);
    parts.push('Phiên âm tiếng Việt bởi LyricPhonics (AI Karaoke Cover Engine)\n');
  }

  // Lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const block: string[] = [];
    block.push(`${i + 1}. ${line.originalText}`);
    block.push(`   Phiên âm: ${line.phoneticText}`);
    if (line.translationText && line.translationText.trim().length > 0) {
      block.push(`   Ý nghĩa:  ${line.translationText}`);
    }
    parts.push(block.join('\n'));
  }

  return parts.join('\n\n');
}
