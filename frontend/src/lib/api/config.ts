/**
 * Helper lấy URL gốc của Backend API từ biến môi trường NEXT_PUBLIC_API_URL.
 * Mặc định fallback về 'http://localhost:5000' khi chạy local.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }
  return 'http://localhost:5000';
}
