import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_AUDIO_MODEL, GEMINI_FALLBACK_MODEL } from '@/lib/gemini/client';
import { LYRICS_PHONETICS_SYSTEM_PROMPT, USER_TRANSCRIBE_INSTRUCTION } from '@/lib/gemini/prompts';
import { geminiLyricsResponseSchema, validateTranscriptionResult } from '@/lib/gemini/schema';
import type { TranscriptionResponse } from '@/types/lyrics';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/webm',
]);

function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, '').trim();
}

export async function POST(request: NextRequest): Promise<NextResponse<TranscriptionResponse>> {
  try {
    // 1. Verify Server-side Environment Secrets
    try {
      getGeminiClient();
    } catch (envError) {
      const message = envError instanceof Error ? envError.message : 'Missing GEMINI_API_KEY';
      return NextResponse.json(
        { success: false, lines: [], error: message },
        { status: 500 }
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = (formData.get('file') ?? formData.get('audio')) as unknown;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          lines: [],
          error: 'No audio file provided. Please attach a file using the "file" or "audio" form field.',
        },
        { status: 400 }
      );
    }

    // 3. Validate MIME type
    const mimeType = file.type || 'audio/mpeg';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          lines: [],
          error: `Unsupported file type "${mimeType}". Allowed formats: MP3, WAV, M4A, AAC, OGG, MP4.`,
        },
        { status: 400 }
      );
    }

    // 4. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          lines: [],
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 25MB limit.`,
        },
        { status: 413 }
      );
    }

    // 5. Convert file to Buffer / Base64 inline data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const ai = getGeminiClient();

    // 6. Execute Gemini Multimodal Audio Generation
    let rawResponseText = '';
    const generateOptions = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: USER_TRANSCRIBE_INSTRUCTION,
            },
          ],
        },
      ],
      config: {
        systemInstruction: LYRICS_PHONETICS_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: geminiLyricsResponseSchema,
      },
    };

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_AUDIO_MODEL,
        ...generateOptions,
      });
      rawResponseText = response.text || '';
    } catch (primaryModelError) {
      console.warn('Gemini primary model failed, attempting fallback model:', primaryModelError);
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          ...generateOptions,
        });
        rawResponseText = fallbackResponse.text || '';
      } catch (fallbackError) {
        console.error('Gemini fallback model also failed:', fallbackError);
        return NextResponse.json(
          {
            success: false,
            lines: [],
            error: 'AI transcription service is temporarily overloaded. Please try again in a few moments.',
          },
          { status: 503 }
        );
      }
    }

    if (!rawResponseText) {
      return NextResponse.json(
        { success: false, lines: [], error: 'Empty response returned from Gemini Audio Engine.' },
        { status: 500 }
      );
    }

    // 7. Parse and Validate with Zod Schema
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawResponseText);
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          lines: [],
          error: `Failed to parse AI output as JSON: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
        },
        { status: 500 }
      );
    }

    const validatedResult = validateTranscriptionResult(parsedJson);

    // 8. Sanitize and Sort lines chronologically
    // Guarantees O(log N) binary search compatibility for Player sync
    const sanitizedLines = validatedResult.lines
      .map((item, index) => ({
        id: `line-${index + 1}`,
        startTime: Number(Math.max(0, item.startTime).toFixed(2)),
        endTime: Number(Math.max(item.startTime, item.endTime).toFixed(2)),
        originalText: sanitizeText(item.originalText),
        phoneticText: sanitizeText(item.phoneticText),
        translationText: sanitizeText(item.translationText),
      }))
      .sort((a, b) => a.startTime - b.startTime);

    return NextResponse.json({
      success: true,
      metadata: {
        title: sanitizeText(validatedResult.metadata.title || file.name.replace(/\.[^/.]+$/, '')),
        artist: sanitizeText(validatedResult.metadata.artist || 'Unknown Artist'),
        detectedLanguage: sanitizeText(validatedResult.metadata.detectedLanguage || 'auto'),
      },
      lines: sanitizedLines,
    });
  } catch (error) {
    console.error('Unhandled transcribe route error:', error);
    return NextResponse.json(
      {
        success: false,
        lines: [],
        error: error instanceof Error ? error.message : 'An unexpected server error occurred.',
      },
      { status: 500 }
    );
  }
}
