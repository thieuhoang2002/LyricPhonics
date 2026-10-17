/**
 * Native Speech Synthesis Utility.
 * Provides client-side native pronunciation playback for lyrics.
 * Strict zero-any TypeScript compliance according to AGENTS.md.
 */

export function mapLanguageToLocale(detectedLanguage?: string): string {
  if (!detectedLanguage) return 'zh-CN';
  const lang = detectedLanguage.toLowerCase();
  if (lang.includes('chin') || lang.includes('zh') || lang.includes('trung')) {
    return 'zh-CN';
  }
  if (lang.includes('jap') || lang.includes('ja') || lang.includes('nhật')) {
    return 'ja-JP';
  }
  if (lang.includes('kor') || lang.includes('ko') || lang.includes('hàn')) {
    return 'ko-KR';
  }
  if (lang.includes('eng') || lang.includes('en') || lang.includes('anh')) {
    return 'en-US';
  }
  if (lang.includes('thai') || lang.includes('th')) {
    return 'th-TH';
  }
  if (lang.includes('viet') || lang.includes('vi')) {
    return 'vi-VN';
  }
  return 'zh-CN';
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakOriginalText(
  text: string,
  detectedLanguage?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: unknown) => void
): () => void {
  if (!isSpeechSupported()) {
    onError?.(new Error('Trình duyệt không hỗ trợ Web Speech Synthesis API'));
    return () => {};
  }

  try {
    window.speechSynthesis.cancel();

    const locale = mapLanguageToLocale(detectedLanguage);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 0.85; // Tốc độ vừa phải giúp người học cover nghe rõ khẩu hình

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === locale.toLowerCase() ||
        v.lang.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase())
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        onError?.(e);
      }
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  } catch (error) {
    onError?.(error);
    return () => {};
  }
}
