import { describe, it, expect } from 'vitest';
import { findLyricIndexByTime } from './binary-search';
import type { LyricLine } from '@/types/lyrics';

describe('Binary Search Lyric Sync (Suite 1.2)', () => {
  const sampleLines: readonly LyricLine[] = [
    { id: '1', startTime: 10.0, endTime: 15.0, originalText: 'Line 1', phoneticText: 'Lai 1', translationText: 'Dong 1' },
    { id: '2', startTime: 20.0, endTime: 25.0, originalText: 'Line 2', phoneticText: 'Lai 2', translationText: 'Dong 2' },
    { id: '3', startTime: 30.0, endTime: 35.0, originalText: 'Line 3', phoneticText: 'Lai 3', translationText: 'Dong 3' },
    { id: '4', startTime: 40.0, endTime: 45.0, originalText: 'Line 4', phoneticText: 'Lai 4', translationText: 'Dong 4' },
  ];

  it('returns -1 for empty array', () => {
    expect(findLyricIndexByTime([], 12.0)).toBe(-1);
  });

  it('returns -1 when currentTime is before the first line', () => {
    expect(findLyricIndexByTime(sampleLines, 0.0)).toBe(-1);
    expect(findLyricIndexByTime(sampleLines, 9.99)).toBe(-1);
  });

  it('returns correct index when currentTime is inside a line [startTime, endTime]', () => {
    expect(findLyricIndexByTime(sampleLines, 12.5)).toBe(0);
    expect(findLyricIndexByTime(sampleLines, 22.0)).toBe(1);
    expect(findLyricIndexByTime(sampleLines, 32.0)).toBe(2);
    expect(findLyricIndexByTime(sampleLines, 42.0)).toBe(3);
  });

  it('matches exact boundaries: startTime and endTime', () => {
    expect(findLyricIndexByTime(sampleLines, 10.0)).toBe(0);
    expect(findLyricIndexByTime(sampleLines, 15.0)).toBe(0);
    expect(findLyricIndexByTime(sampleLines, 20.0)).toBe(1);
    expect(findLyricIndexByTime(sampleLines, 45.0)).toBe(3);
  });

  it('keeps previous line active during interludes/gaps between lines', () => {
    expect(findLyricIndexByTime(sampleLines, 16.0)).toBe(0);
    expect(findLyricIndexByTime(sampleLines, 19.99)).toBe(0);
  });

  it('returns the last line index when currentTime is past the final line', () => {
    expect(findLyricIndexByTime(sampleLines, 50.0)).toBe(3);
    expect(findLyricIndexByTime(sampleLines, 1000.0)).toBe(3);
  });

  it('handles single-item line array', () => {
    const single: readonly LyricLine[] = [
      { id: 'solo', startTime: 5.0, endTime: 10.0, originalText: 'Solo', phoneticText: 'So lo', translationText: 'Don ca' },
    ];
    expect(findLyricIndexByTime(single, 2.0)).toBe(-1);
    expect(findLyricIndexByTime(single, 5.0)).toBe(0);
    expect(findLyricIndexByTime(single, 7.5)).toBe(0);
    expect(findLyricIndexByTime(single, 15.0)).toBe(0);
  });

  it('verifies O(log N) performance on 10,000 lyric lines (< 50ms for 10,000 queries)', () => {
    const count = 10_000;
    const largeLines: LyricLine[] = [];
    for (let i = 0; i < count; i++) {
      largeLines.push({
        id: `line-${i}`,
        startTime: i * 5,
        endTime: i * 5 + 3,
        originalText: `Text ${i}`,
        phoneticText: `Phonetic ${i}`,
        translationText: `Nghia ${i}`,
      });
    }

    let matchCount = 0;
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      const targetTime = i * 5 + 1.5;
      const index = findLyricIndexByTime(largeLines, targetTime);
      if (index === i) {
        matchCount++;
      }
    }
    const elapsed = performance.now() - t0;

    expect(matchCount).toBe(count);
    expect(elapsed).toBeLessThan(50);
  });
});
