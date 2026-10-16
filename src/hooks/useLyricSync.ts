'use client';

import { useMemo } from 'react';
import type { LyricLine } from '@/types/lyrics';
import { findLyricIndexByTime } from '@/lib/utils/binary-search';

export interface UseLyricSyncReturn {
  readonly activeLineIndex: number;
  readonly activeLine: LyricLine | null;
}

/**
 * Custom hook to synchronously find the active lyric line at currentTime.
 * Employs strictly O(log N) Binary Search on sorted lines.
 * Strictly avoids nested loops or linear O(N) array scans during 60fps renders.
 */
export function useLyricSync(
  lines: readonly LyricLine[],
  currentTime: number
): UseLyricSyncReturn {
  const activeLineIndex = useMemo(() => {
    return findLyricIndexByTime(lines, currentTime);
  }, [lines, currentTime]);

  const activeLine = useMemo(() => {
    if (activeLineIndex >= 0 && activeLineIndex < lines.length) {
      return lines[activeLineIndex];
    }
    return null;
  }, [lines, activeLineIndex]);

  return {
    activeLineIndex,
    activeLine,
  };
}
