export interface UserProfile {
  id: string;
  email: string;
  songCredits: number;
  totalSongsCreated: number;
  isAdmin: boolean;
  createdAt: string;
}

const TOKEN_KEY = 'lyricphonics_auth_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('http://localhost:5000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken();
      }
      return null;
    }

    const data = await res.json();
    return data as UserProfile;
  } catch (err) {
    console.warn('Không thể lấy thông tin người dùng:', err);
    return null;
  }
}
