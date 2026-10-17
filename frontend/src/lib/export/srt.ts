import type { LyricLine } from '@/types/lyrics';

/**
 * Format float seconds into SRT timestamp: hh:mm:ss,ms (e.g. 00:01:15,320)
 */
function formatSrtTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00:00,000';
  }

  const floorSeconds = Math.floor(seconds);
  const milliseconds = Math.round((seconds - floorSeconds) * 1000);

  const hours = Math.floor(floorSeconds / 3600);
  const minutes = Math.floor((floorSeconds % 3600) / 60);
  const remainingSeconds = floorSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');
  const ms = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss},${ms}`;
}

/**
 * Exports synchronized lyrics to SubRip Subtitle (.srt) format.
 * Compatible with CapCut, Adobe Premiere, and video editing suites for TikTok cover videos.
 */
export function exportToSrt(lines: readonly LyricLine[]): string {
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const index = i + 1;
    const startTag = formatSrtTimestamp(line.startTime);
    const endTag = formatSrtTimestamp(Math.max(line.startTime + 0.5, line.endTime));

    const subtitleText = `${line.originalText}\n${line.phoneticText}`;

    output.push(`${index}\n${startTag} --> ${endTag}\n${subtitleText}`);
  }

  return output.join('\n\n');
}
