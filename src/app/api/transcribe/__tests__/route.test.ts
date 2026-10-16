import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock the Gemini client factory
vi.mock('@/lib/gemini/client', () => ({
  getGeminiClient: vi.fn(),
  GEMINI_AUDIO_MODEL: 'gemini-2.5-flash',
  GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash',
}));

import { getGeminiClient } from '@/lib/gemini/client';

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  it('should return 400 when no file is uploaded', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('No audio file provided');
  });

  it('should return 400 for unsupported file MIME types', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    formData.append('file', file);

    const req = new NextRequest('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Unsupported file type');
  });

  it('should return 500 when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    vi.mocked(getGeminiClient).mockImplementationOnce(() => {
      throw new Error('MISSING_GEMINI_API_KEY');
    });

    const formData = new FormData();
    const file = new File(['dummy audio'], 'song.mp3', { type: 'audio/mpeg' });
    formData.append('file', file);

    const req = new NextRequest('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('MISSING_GEMINI_API_KEY');
  });

  it('should return 200 with structured transcription on success', async () => {
    const mockApiResponse = JSON.stringify({
      metadata: {
        detectedLanguage: 'Language-Alpha',
        title: 'Synthetic Track Title',
        artist: 'Synthetic Artist',
      },
      lines: [
        {
          startTime: 1.5,
          endTime: 4.8,
          originalText: 'Alpha original phrase one',
          phoneticText: 'An-pha ô-ri-gi-nơ phờ-rây-sơ oăn',
          translationText: 'Cụm từ gốc mẫu số một',
        },
        {
          startTime: 5.2,
          endTime: 8.9,
          originalText: 'Beta original phrase two',
          phoneticText: 'Bê-ta ô-ri-gi-nơ phờ-rây-sơ tu',
          translationText: 'Cụm từ gốc mẫu số hai',
        },
      ],
    });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: mockApiResponse,
    });

    vi.mocked(getGeminiClient).mockReturnValue({
      models: {
        generateContent: mockGenerateContent,
      },
    } as unknown as ReturnType<typeof getGeminiClient>);

    const formData = new FormData();
    const file = new File(['fake mp3 data'], 'song.mp3', { type: 'audio/mpeg' });
    formData.append('file', file);

    const req = new NextRequest('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lines).toHaveLength(2);
    expect(json.lines[0]).toEqual({
      id: 'line-1',
      startTime: 1.5,
      endTime: 4.8,
      originalText: 'Alpha original phrase one',
      phoneticText: 'An-pha ô-ri-gi-nơ phờ-rây-sơ oăn',
      translationText: 'Cụm từ gốc mẫu số một',
    });
  });
});
