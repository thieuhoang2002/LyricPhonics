import { describe, it, expect } from 'vitest';
import {
  formatSecondsToLrc,
  parseLrcTimestamp,
  formatDisplayTime,
} from './time';

describe('Time Utilities (Suite 1.1)', () => {
  describe('formatSecondsToLrc', () => {
    it('formats 0 seconds to [00:00.00]', () => {
      expect(formatSecondsToLrc(0)).toBe('[00:00.00]');
    });

    it('formats 75.32 seconds to [01:15.32]', () => {
      expect(formatSecondsToLrc(75.32)).toBe('[01:15.32]');
    });

    it('formats times over 1 hour (3665.42 seconds) to [61:05.42]', () => {
      expect(formatSecondsToLrc(3665.42)).toBe('[61:05.42]');
    });

    it('handles negative or NaN inputs safely', () => {
      expect(formatSecondsToLrc(-5)).toBe('[00:00.00]');
      expect(formatSecondsToLrc(NaN)).toBe('[00:00.00]');
      expect(formatSecondsToLrc(Number.POSITIVE_INFINITY)).toBe('[00:00.00]');
    });

    it('pads single digit hundredths correctly', () => {
      expect(formatSecondsToLrc(12.05)).toBe('[00:12.05]');
    });
  });

  describe('parseLrcTimestamp', () => {
    it('parses [00:00.00] to 0', () => {
      expect(parseLrcTimestamp('[00:00.00]')).toBe(0);
    });

    it('parses [01:15.32] to 75.32', () => {
      expect(parseLrcTimestamp('[01:15.32]')).toBe(75.32);
    });

    it('parses [61:05.42] to 3665.42', () => {
      expect(parseLrcTimestamp('[61:05.42]')).toBe(3665.42);
    });

    it('supports timestamps without brackets', () => {
      expect(parseLrcTimestamp('01:15.32')).toBe(75.32);
    });

    it('supports [hh:mm:ss.xx] 3-part timestamps', () => {
      expect(parseLrcTimestamp('[01:01:05.42]')).toBe(3665.42);
    });

    it('handles invalid or empty strings gracefully', () => {
      expect(parseLrcTimestamp('')).toBe(0);
      expect(parseLrcTimestamp('invalid')).toBe(0);
    });
  });

  describe('formatDisplayTime', () => {
    it('formats seconds under 1 hour as mm:ss', () => {
      expect(formatDisplayTime(0)).toBe('00:00');
      expect(formatDisplayTime(75)).toBe('01:15');
      expect(formatDisplayTime(3599)).toBe('59:59');
    });

    it('formats seconds >= 1 hour as hh:mm:ss', () => {
      expect(formatDisplayTime(3600)).toBe('01:00:00');
      expect(formatDisplayTime(3665)).toBe('01:01:05');
      expect(formatDisplayTime(7325)).toBe('02:02:05');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatDisplayTime(-10)).toBe('00:00');
      expect(formatDisplayTime(NaN)).toBe('00:00');
    });
  });

  describe('Roundtrip precision verification', () => {
    it('guarantees roundtrip conversion precision <= 0.01s', () => {
      const testCases = [0, 1.23, 45.67, 120.99, 543.21];
      for (const original of testCases) {
        const formatted = formatSecondsToLrc(original);
        const parsed = parseLrcTimestamp(formatted);
        expect(Math.abs(parsed - original)).toBeLessThanOrEqual(0.01);
      }
    });
  });
});
