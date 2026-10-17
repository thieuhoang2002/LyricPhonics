import { describe, it, expect } from 'vitest';
import { validateAudioFile, sanitizeHtml } from './security';

describe('Security & Content Isolation (Suite 3.1 & 3.2)', () => {
  describe('validateAudioFile', () => {
    it('approves valid MP3 audio file under 25MB', () => {
      const validFile = new File(['audio buffer content'], 'song.mp3', {
        type: 'audio/mpeg',
      });
      const result = validateAudioFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects unsupported extensions like .pdf or .exe', () => {
      const maliciousFile = new File(['not audio'], 'document.pdf', {
        type: 'application/pdf',
      });
      const result = validateAudioFile(maliciousFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('không được hỗ trợ');
    });

    it('rejects empty file (0 bytes)', () => {
      const emptyFile = new File([], 'empty.mp3', { type: 'audio/mpeg' });
      const result = validateAudioFile(emptyFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('kích thước 0 bytes');
    });

    it('rejects non-File inputs', () => {
      expect(validateAudioFile(null).isValid).toBe(false);
      expect(validateAudioFile('string' as unknown).isValid).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes dangerous HTML script tags to prevent XSS', () => {
      const dirty = '<script>alert("xss")</script>';
      const clean = sanitizeHtml(dirty);
      expect(clean).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(clean).not.toContain('<script>');
    });

    it('escapes image error injection payload', () => {
      const dirty = '<img src=x onerror=alert(1)>';
      const clean = sanitizeHtml(dirty);
      expect(clean).toContain('&lt;img');
      expect(clean).toContain('&gt;');
    });

    it('preserves foreign script characters and tone marks', () => {
      const text = 'Tôi yêu bạn / Wo ai ni / 莎朗嘿';
      const clean = sanitizeHtml(text);
      expect(clean).toBe(text);
    });

    it('strips non-printable ASCII control characters', () => {
      const textWithNull = 'Line\u0000Text\u0008End';
      const clean = sanitizeHtml(textWithNull);
      expect(clean).toBe('LineTextEnd');
    });
  });
});
