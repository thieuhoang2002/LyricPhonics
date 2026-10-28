/**
 * src/lib/api/piano.ts
 *
 * API client for interacting with the .NET 8 Piano Transcription endpoints.
 */

import { getApiBaseUrl } from './config';
import type { PianoTranscriptionResult } from '@/types/piano';

export interface PianoTranscribeResponse {
  readonly success: boolean;
  readonly result?: PianoTranscriptionResult;
  readonly songCredits?: number;
  readonly error?: string;
  readonly message?: string;
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

  const data = await response.json();

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
      message: data.error || 'Quá trình hòa âm Piano thất bại. Vui lòng thử lại với tệp âm thanh rõ ràng hơn.',
    };
  }

  return {
    success: true,
    result: data.result,
    songCredits: data.songCredits,
  };
}
