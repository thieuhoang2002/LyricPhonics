import { describe, it, expect } from 'vitest';
import { generateLrcContent, parseLrcContent } from './lrc';
import type { LyricLine, TranscriptionMetadata } from '@/types/lyrics';

describe('LRC Generator and Parser (Suite 1.3)', () => {
  const sampleLines: LyricLine[] = [
    {
      id: 'line-1',
      startTime: 12.34,
      endTime: 15.5,
      originalText: 'Alpha phrase',
      phoneticText: 'An-pha phờ-rây',
      translationText: 'Cụm từ mẫu một',
    },
    {
      id: 'line-2',
      startTime: 16.0,
      endTime: 20.25,
      originalText: 'Beta phrase',
      phoneticText: 'Bê-ta phờ-rây',
      translationText: 'Cụm từ mẫu hai',
    },
  ];

  const sampleMetadata: TranscriptionMetadata = {
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    creator: 'LyricPhonics',
  };

  it('generates standard LRC content with metadata', () => {
    const lrc = generateLrcContent(sampleLines, sampleMetadata);
    expect(lrc).toContain('[ti:Test Song]');
    expect(lrc).toContain('[ar:Test Artist]');
    expect(lrc).toContain('[al:Test Album]');
    expect(lrc).toContain('[by:LyricPhonics]');
    expect(lrc).toContain('[00:12.34]Alpha phrase (An-pha phờ-rây)');
    expect(lrc).toContain('[00:16.00]Beta phrase (Bê-ta phờ-rây)');
  });

  it('parses LRC content back to LyricLine objects', () => {
    const lrc = generateLrcContent(sampleLines, sampleMetadata);
    const parsed = parseLrcContent(lrc);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].originalText).toBe('Alpha phrase');
    expect(parsed[0].phoneticText).toBe('An-pha phờ-rây');
    expect(parsed[0].startTime).toBe(12.34);
    expect(parsed[0].endTime).toBe(16.0);

    expect(parsed[1].originalText).toBe('Beta phrase');
    expect(parsed[1].phoneticText).toBe('Bê-ta phờ-rây');
    expect(parsed[1].startTime).toBe(16.0);
    expect(parsed[1].endTime).toBe(19.0);
  });

  it('handles empty or malformed LRC strings cleanly', () => {
    expect(parseLrcContent('')).toEqual([]);
    expect(parseLrcContent('[ti:Only Metadata]')).toEqual([]);
  });
});
