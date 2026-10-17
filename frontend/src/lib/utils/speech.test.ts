import { describe, it, expect } from 'vitest';
import { mapLanguageToLocale } from './speech';

describe('Speech Utils - mapLanguageToLocale', () => {
  it('maps Chinese language variations correctly to zh-CN', () => {
    expect(mapLanguageToLocale('chinese')).toBe('zh-CN');
    expect(mapLanguageToLocale('CHINESE')).toBe('zh-CN');
    expect(mapLanguageToLocale('zh')).toBe('zh-CN');
    expect(mapLanguageToLocale('tiếng trung')).toBe('zh-CN');
  });

  it('maps Japanese variations correctly to ja-JP', () => {
    expect(mapLanguageToLocale('japanese')).toBe('ja-JP');
    expect(mapLanguageToLocale('ja')).toBe('ja-JP');
    expect(mapLanguageToLocale('tiếng nhật')).toBe('ja-JP');
  });

  it('maps Korean variations correctly to ko-KR', () => {
    expect(mapLanguageToLocale('korean')).toBe('ko-KR');
    expect(mapLanguageToLocale('ko')).toBe('ko-KR');
    expect(mapLanguageToLocale('tiếng hàn')).toBe('ko-KR');
  });

  it('maps English variations correctly to en-US', () => {
    expect(mapLanguageToLocale('english')).toBe('en-US');
    expect(mapLanguageToLocale('en')).toBe('en-US');
    expect(mapLanguageToLocale('tiếng anh')).toBe('en-US');
  });

  it('fallbacks to zh-CN if undefined or empty', () => {
    expect(mapLanguageToLocale(undefined)).toBe('zh-CN');
    expect(mapLanguageToLocale('')).toBe('zh-CN');
  });
});
