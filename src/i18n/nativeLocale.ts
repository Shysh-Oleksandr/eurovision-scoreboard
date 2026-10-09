import {
  DEFAULT_LOCALE,
  matchLocale,
  SUPPORTED_LOCALES,
  SupportedLocale,
} from './catalog';

/**
 * Locale handling for the native apps. The web build keeps the locale in a
 * cookie the server reads; the native bundle is a static export rendered once
 * in English, so the client decides: the user's saved choice, else the first
 * supported device language, else English.
 */
export const APP_LOCALE_STORAGE_KEY = 'app-locale';

export function getStoredLocale(): SupportedLocale | null {
  try {
    const stored = localStorage.getItem(APP_LOCALE_STORAGE_KEY);

    return SUPPORTED_LOCALES.includes(stored as SupportedLocale)
      ? (stored as SupportedLocale)
      : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the choice lasts for this session only.
  }
}

export function detectDeviceLocale(
  languages: readonly string[] = typeof navigator === 'undefined'
    ? []
    : navigator.languages?.length
    ? navigator.languages
    : [navigator.language],
): SupportedLocale {
  for (const tag of languages) {
    const locale = matchLocale(tag);

    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

export function resolveNativeLocale(): SupportedLocale {
  return getStoredLocale() ?? detectDeviceLocale();
}
