import { afterEach, describe, expect, it } from 'vitest';

import { matchLocale, normalizeLocale } from './catalog';
import {
  APP_LOCALE_STORAGE_KEY,
  detectDeviceLocale,
  getStoredLocale,
  resolveNativeLocale,
  storeLocale,
} from './nativeLocale';

describe('matchLocale', () => {
  it('maps region tags to supported locales', () => {
    expect(matchLocale('uk-UA')).toBe('uk');
    expect(matchLocale('pt-BR')).toBe('pt');
    expect(matchLocale('EN-gb')).toBe('en');
  });

  it('maps the BCP 47 Greek tag to the app locale', () => {
    expect(matchLocale('el-GR')).toBe('gr');
    expect(matchLocale('el')).toBe('gr');
    expect(matchLocale('gr')).toBe('gr');
  });

  it('returns null for unsupported tags; normalizeLocale falls back to en', () => {
    expect(matchLocale('ja-JP')).toBeNull();
    expect(matchLocale('')).toBeNull();
    expect(normalizeLocale('ja-JP')).toBe('en');
  });
});

describe('detectDeviceLocale', () => {
  it('takes the first supported device language', () => {
    expect(detectDeviceLocale(['ja-JP', 'de-AT', 'fr-FR'])).toBe('de');
  });

  it('falls back to English', () => {
    expect(detectDeviceLocale(['ja-JP', 'ko-KR'])).toBe('en');
    expect(detectDeviceLocale([])).toBe('en');
  });
});

describe('stored locale', () => {
  afterEach(() => localStorage.clear());

  it('round-trips a supported locale', () => {
    storeLocale('pl');
    expect(getStoredLocale()).toBe('pl');
  });

  it('ignores unsupported stored values', () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'xx');
    expect(getStoredLocale()).toBeNull();
  });

  it('prefers the saved choice over the device language', () => {
    storeLocale('it');
    expect(resolveNativeLocale()).toBe('it');
  });
});
