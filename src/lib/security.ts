/**
 * src/lib/security.ts
 *
 * Content security, input validation and storage safety utilities.
 * Enforces strict Content Isolation as per AGENTS.md.
 */

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

const ALLOWED_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.mp4',
  '.webm',
]);

export interface FileValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
}

/**
 * Validates uploaded audio/video files for security and size constraints.
 */
export function validateAudioFile(file: unknown): FileValidationResult {
  if (!file || !(file instanceof File)) {
    return {
      isValid: false,
      error: 'Tệp tải lên không hợp lệ hoặc bị trống.',
    };
  }

  // Check empty file
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'Tệp tải lên không có dữ liệu (kích thước 0 bytes).',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép (25MB).`,
    };
  }

  // Check extension
  const fileName = file.name.toLowerCase();
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      isValid: false,
      error: `Phần mở rộng "${extension}" không được hỗ trợ. Vui lòng chọn tệp .mp3, .wav, .m4a, .mp4, .ogg.`,
    };
  }

  // Check MIME type
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      isValid: false,
      error: `Định dạng tệp "${file.type}" không được hỗ trợ.`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes external / AI-generated text to prevent XSS and prompt injection tags.
 */
export function sanitizeHtml(rawText: string): string {
  if (typeof rawText !== 'string') {
    return '';
  }

  return rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // strip control chars
    .trim();
}

/**
 * Safe localStorage wrapper that avoids QuotaExceededError and SSR issues.
 * Strictly avoids storing heavy audio blobs in localStorage as per AGENTS.md.
 */
export function safeLocalStorageSet<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const serialized = JSON.stringify(value);
    // Quota guard: reject serialization larger than 2MB
    if (serialized.length > 2 * 1024 * 1024) {
      console.warn(`[StorageGuard] Dữ liệu khóa "${key}" quá lớn (${serialized.length} bytes), từ chối lưu.`);
      return false;
    }
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.error(`[StorageGuard] Lỗi ghi localStorage cho khóa "${key}":`, err);
    return false;
  }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`[StorageGuard] Lỗi đọc localStorage cho khóa "${key}":`, err);
    return fallback;
  }
}
