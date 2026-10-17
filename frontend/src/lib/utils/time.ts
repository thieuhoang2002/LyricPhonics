/**
 * Time formatting and parsing utilities for LyricPhonics.
 * Temporal precision: milliseconds / hundredths of a second.
 */

/**
 * Format float seconds into standard LRC timestamp format: [mm:ss.xx]
 * Example: 75.32 -> "[01:15.32]"
 */
export function formatSecondsToLrc(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '[00:00.00]';
  }

  const totalHundredths = Math.round(seconds * 100);
  const totalSeconds = Math.floor(totalHundredths / 100);
  const hundredths = totalHundredths % 100;

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');
  const xx = String(hundredths).padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

/**
 * Parse an LRC timestamp tag into float seconds.
 * Supports: [mm:ss.xx], [mm:ss.xxx], [hh:mm:ss.xx], or without brackets mm:ss.xx
 * Example: "[01:15.32]" -> 75.32
 */
export function parseLrcTimestamp(tag: string): number {
  if (typeof tag !== 'string' || tag.trim().length === 0) {
    return 0;
  }

  const cleaned = tag.trim().replace(/^\[|\]$/g, '');
  const parts = cleaned.split(':');

  if (parts.length === 2) {
    const minutes = Number.parseFloat(parts[0]);
    const seconds = Number.parseFloat(parts[1]);

    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return 0;
    }

    return Math.max(0, Number.parseFloat((minutes * 60 + seconds).toFixed(3)));
  }

  if (parts.length === 3) {
    const hours = Number.parseFloat(parts[0]);
    const minutes = Number.parseFloat(parts[1]);
    const seconds = Number.parseFloat(parts[2]);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return 0;
    }

    return Math.max(0, Number.parseFloat((hours * 3600 + minutes * 60 + seconds).toFixed(3)));
  }

  return 0;
}

/**
 * Format float seconds for Audio Player UI display.
 * Under 1 hour: "mm:ss" (e.g. "01:15")
 * 1 hour or more: "hh:mm:ss" (e.g. "01:05:32")
 */
export function formatDisplayTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const floorSeconds = Math.floor(seconds);
  const hours = Math.floor(floorSeconds / 3600);
  const minutes = Math.floor((floorSeconds % 3600) / 60);
  const remainingSeconds = floorSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
}
