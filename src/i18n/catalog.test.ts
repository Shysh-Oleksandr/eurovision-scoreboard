import { describe, expect, it } from 'vitest';

import { languageTag, matchLocale, SUPPORTED_LOCALES } from './catalog';

describe('languageTag', () => {
  it('gives Greek its BCP 47 code and leaves the rest alone', () => {
    expect(languageTag('gr')).toBe('el');
    expect(languageTag('en')).toBe('en');
    expect(languageTag('uk')).toBe('uk');
  });

  it.each(SUPPORTED_LOCALES)('%s is a language Intl knows', (locale) => {
    const tag = languageTag(locale);
    const resolved = new Intl.DateTimeFormat(tag).resolvedOptions().locale;

    // An unknown tag silently resolves to the default (English) locale.
    expect(resolved.split('-')[0]).toBe(tag);
  });

  it.each(SUPPORTED_LOCALES)('%s maps back to itself', (locale) => {
    expect(matchLocale(languageTag(locale))).toBe(locale);
  });
});
