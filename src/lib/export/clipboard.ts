import type { LyricLine, TranscriptionMetadata } from '@/types/lyrics';

/**
 * Formats synchronized lyrics for instant social sharing or note copying.
 */
export function formatForClipboard(
  lines: readonly LyricLine[],
  metadata?: TranscriptionMetadata
): string {
  const parts: string[] = [];

  if (metadata?.title) {
    const artist = metadata.artist ? ` - ${metadata.artist}` : '';
    parts.push(`🎵 ${metadata.title}${artist} (Phiên âm bởi LyricPhonics)\n`);
  }

  for (const line of lines) {
    let lineStr = `✨ ${line.originalText}\n👉 ${line.phoneticText}`;
    if (line.translationText && line.translationText.trim().length > 0) {
      lineStr += `\n💬 ${line.translationText}`;
    }
    parts.push(lineStr);
  }

  return parts.join('\n\n');
}

/**
 * Safely copies text to the browser's clipboard.
 * Supports modern navigator.clipboard with fallback for older environments.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err);
    return false;
  }
}

/**
 * Triggers a direct browser file download for a text/string payload.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
