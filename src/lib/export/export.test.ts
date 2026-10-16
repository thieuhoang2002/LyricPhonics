import { describe, it, expect } from 'vitest';
import { exportToTxt } from './txt';
import { exportToSrt } from './srt';
import { formatForClipboard } from './clipboard';
import type { LyricLine, TranscriptionMetadata } from '@/types/lyrics';

describe('Multi-Format Export Utilities (Suite 1.3)', () => {
  const sampleLines: LyricLine[] = [
    {
      id: 'line-1',
      startTime: 12.34,
      endTime: 15.5,
      originalText: 'Alpha sample phrase',
      phoneticText: 'An-pha sem-pồ phờ-rây',
      translationText: 'Cụm từ mẫu alpha',
    },
    {
      id: 'line-2',
      startTime: 16.0,
      endTime: 20.25,
      originalText: 'Beta sample phrase',
      phoneticText: 'Bê-ta sem-pồ phờ-rây',
      translationText: 'Cụm từ mẫu beta',
    },
  ];

  const sampleMetadata: TranscriptionMetadata = {
    title: 'Synthetic Track',
    artist: 'Synthetic Singer',
  };

  describe('exportToTxt', () => {
    it('generates formatted text with metadata header and numbered lines', () => {
      const txt = exportToTxt(sampleLines, sampleMetadata);
      expect(txt).toContain('=== Synthetic Track - Synthetic Singer ===');
      expect(txt).toContain('1. Alpha sample phrase');
      expect(txt).toContain('Phiên âm: An-pha sem-pồ phờ-rây');
      expect(txt).toContain('Ý nghĩa:  Cụm từ mẫu alpha');
      expect(txt).toContain('2. Beta sample phrase');
    });

    it('handles lines without translationText', () => {
      const simpleLines: LyricLine[] = [
        {
          id: '1',
          startTime: 1,
          endTime: 2,
          originalText: 'Simple',
          phoneticText: 'Sim-pồ',
          translationText: '',
        },
      ];
      const txt = exportToTxt(simpleLines);
      expect(txt).toContain('1. Simple');
      expect(txt).not.toContain('Ý nghĩa:');
    });
  });

  describe('exportToSrt', () => {
    it('generates compliant SubRip subtitle format with accurate millisecond tags', () => {
      const srt = exportToSrt(sampleLines);
      expect(srt).toContain('1\n00:00:12,340 --> 00:00:15,500\nAlpha sample phrase\nAn-pha sem-pồ phờ-rây');
      expect(srt).toContain('2\n00:00:16,000 --> 00:00:20,250\nBeta sample phrase\nBê-ta sem-pồ phờ-rây');
    });
  });

  describe('formatForClipboard', () => {
    it('formats lines with emojis for social sharing', () => {
      const clipboardText = formatForClipboard(sampleLines, sampleMetadata);
      expect(clipboardText).toContain('Synthetic Track');
      expect(clipboardText).toContain('✨ Alpha sample phrase');
      expect(clipboardText).toContain('👉 An-pha sem-pồ phờ-rây');
      expect(clipboardText).toContain('💬 Cụm từ mẫu alpha');
    });
  });
});
