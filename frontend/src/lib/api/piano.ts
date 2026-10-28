/**
 * src/lib/api/piano.ts
 *
 * API client for interacting with the .NET 8 Piano Transcription endpoints.
 */

import { getApiBaseUrl } from './config';
import type {
  PianoTranscriptionResult,
  PianoNoteEvent,
  PianoChordSegment,
  PianoSectionSegment,
  PianoHand,
} from '@/types/piano';

export interface PianoTranscribeResponse {
  readonly success: boolean;
  readonly result?: PianoTranscriptionResult;
  readonly songCredits?: number;
  readonly error?: string;
  readonly message?: string;
}

/**
 * Chuẩn hóa payload nhận về từ Backend .NET hoặc JSON thô của Gemini sang định dạng đồng nhất cho giao diện.
 * Đảm bảo không bao giờ bị lỗi Undefined Properties giữa Flat DTO (.NET) và Nested Interface (Frontend).
 */
export function normalizePianoResult(raw: unknown): PianoTranscriptionResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawMeta = (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>;

  const metadata = {
    title: String(rawMeta.title || r.title || 'Bản Phối Piano'),
    artist: String(rawMeta.artist || r.artist || 'Unknown Artist'),
    bpm: typeof rawMeta.bpm === 'number' ? rawMeta.bpm : (typeof r.bpm === 'number' ? r.bpm : 120),
    keySignature: String(rawMeta.keySignature || r.keySignature || 'C Major'),
    timeSignature: String(rawMeta.timeSignature || r.timeSignature || '4/4'),
    duration: typeof rawMeta.duration === 'number' ? rawMeta.duration : (typeof r.duration === 'number' ? r.duration : 0),
  };

  const rawNotes = Array.isArray(r.notes) ? (r.notes as Record<string, unknown>[]) : [];
  const notes: PianoNoteEvent[] = rawNotes.map((n) => {
    const pitch = typeof n.pitch === 'number' ? n.pitch : (typeof n.midi === 'number' ? n.midi : 60);
    const isLeft = n.hand === 'left' || n.hand === 1 || n.hand === '1';
    return {
      pitch,
      noteName: String(n.noteName || n.name || ''),
      startTime: typeof n.startTime === 'number' ? n.startTime : 0,
      duration: typeof n.duration === 'number' ? n.duration : 0.5,
      velocity: typeof n.velocity === 'number' ? n.velocity : 80,
      hand: isLeft ? ('left' as const) : ('right' as const),
      finger: typeof n.finger === 'number' && n.finger > 0 ? n.finger : undefined,
    };
  });

  const rawChords = Array.isArray(r.chords) ? (r.chords as Record<string, unknown>[]) : [];
  const chords: PianoChordSegment[] = rawChords.map((c) => ({
    chord: String(c.chord || ''),
    startTime: typeof c.startTime === 'number' ? c.startTime : 0,
    endTime: typeof c.endTime === 'number' ? c.endTime : 0,
    root: String(c.root || c.chord || ''),
    quality: String(c.quality || 'Major'),
  }));

  const rawSections = Array.isArray(r.sections) ? (r.sections as Record<string, unknown>[]) : [];
  const sections: PianoSectionSegment[] = rawSections.map((s) => ({
    name: String(s.name || ''),
    startTime: typeof s.startTime === 'number' ? s.startTime : 0,
    endTime: typeof s.endTime === 'number' ? s.endTime : 0,
  }));

  return {
    metadata,
    notes,
    chords,
    sections,
  };
}

/**
 * Sends an audio file (.mp3, .wav, .m4a <= 25MB) to the backend for AI Piano transcription.
 *
 * @param file The audio file to transcribe
 * @param token JWT authentication token of the logged-in user
 */
export async function transcribeAudioToPiano(
  file: File,
  token: string
): Promise<PianoTranscribeResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const apiUrl = `${getApiBaseUrl()}/api/piano/transcribe`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!data) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Không nhận được phản hồi hợp lệ từ máy chủ. Vui lòng thử lại.',
    };
  }

  if (response.status === 401) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }

  if (response.status === 403 || data.error === 'OUT_OF_CREDITS') {
    return {
      success: false,
      error: 'OUT_OF_CREDITS',
      message: data.message || 'Bạn đã sử dụng hết lượt tạo bài hát. Vui lòng mua thêm gói.',
    };
  }

  if (!response.ok || !data.success) {
    return {
      success: false,
      error: data.error || 'TRANSCRIPTION_FAILED',
      message: data.message || data.error || 'Quá trình hòa âm Piano thất bại. Vui lòng thử lại với tệp âm thanh rõ ràng hơn.',
    };
  }

  const rawResult = data.result || data.data;
  if (!rawResult) {
    return {
      success: false,
      error: 'EMPTY_RESULT',
      message: 'Không có dữ liệu nốt Piano trong phản hồi của máy chủ.',
    };
  }

  return {
    success: true,
    result: normalizePianoResult(rawResult),
    songCredits: data.songCredits,
  };
}
