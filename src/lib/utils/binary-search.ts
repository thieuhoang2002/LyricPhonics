import type { LyricLine } from '@/types/lyrics';

/**
 * Binary search algorithm with strictly O(log N) time complexity.
 * Searches for the active lyric line index corresponding to currentTime.
 * 
 * Rules:
 * 1. Array `lines` MUST be pre-sorted in ascending order by `startTime`.
 * 2. If currentTime < lines[0].startTime, returns -1 (before lyric starts).
 * 3. If currentTime is within [lines[i].startTime, lines[i].endTime], returns i.
 * 4. If currentTime is in a gap between lines[i].endTime and lines[i+1].startTime,
 *    returns i (keeps the most recent active line).
 * 5. If currentTime >= lines[lines.length - 1].startTime, returns lines.length - 1.
 * 6. Returns -1 for empty array.
 * 
 * Complexity: O(log N) time, O(1) auxiliary space.
 */
export function findLyricIndexByTime(
  lines: readonly LyricLine[],
  currentTime: number
): number {
  const len = lines.length;
  if (len === 0 || !Number.isFinite(currentTime) || currentTime < lines[0].startTime) {
    return -1;
  }

  let low = 0;
  let high = len - 1;
  let candidate = -1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const midStartTime = lines[mid].startTime;

    if (midStartTime <= currentTime) {
      candidate = mid;
      low = mid + 1; // Look further to find the latest line starting before or at currentTime
    } else {
      high = mid - 1;
    }
  }

  return candidate;
}
