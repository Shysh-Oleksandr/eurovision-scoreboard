import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED_LOCALES = [
  'en',
  'es',
  'fr',
  'uk',
  'de',
  'pl',
  'it',
  'gr',
  'pt',
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = 'en';

export function normalizeLocale(
  raw: string | undefined | null,
): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;

  const lower = raw.toLowerCase();

  for (const locale of SUPPORTED_LOCALES) {
    if (lower.startsWith(locale)) return locale;
  }

  return DEFAULT_LOCALE;
}

function parseAcceptLanguage(value: string | null): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;

  const parts = value.split(',');

  for (const part of parts) {
    const [tag] = part.trim().split(';');
    const locale = normalizeLocale(tag);
    if (SUPPORTED_LOCALES.includes(locale)) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}

function deepMergeMessages(base: any, override: any): any {
  if (typeof base !== 'object' || base === null) return override;
  if (typeof override !== 'object' || override === null)
    return override ?? base;

  const result: any = Array.isArray(base) ? [...base] : { ...base };

  for (const key of Object.keys(override)) {
    const baseValue = (base as any)[key];
    const overrideValue = (override as any)[key];

    if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = deepMergeMessages(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }

  return result;
}

// The en+locale deep merge produces a ~70 KB structure and is otherwise
// repeated on every request; cache it per locale for the life of the isolate.
const mergedMessagesCache = new Map<SupportedLocale, any>();

async function getMessages(locale: SupportedLocale) {
  const cached = mergedMessagesCache.get(locale);

  if (cached) return cached;

  const defaultMessages = (await import('../../messages/en.json')).default;

  let messages = defaultMessages;

  if (locale !== 'en') {
    const localeMessages = (await import(`../../messages/${locale}.json`))
      .default;

    messages = deepMergeMessages(defaultMessages, localeMessages);
  }

  mergedMessagesCache.set(locale, messages);

  return messages;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as
    | SupportedLocale
    | undefined;

  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');

  const resolvedLocale: SupportedLocale =
    (cookieLocale && normalizeLocale(cookieLocale)) ||
    parseAcceptLanguage(acceptLanguage);

  return {
    locale: resolvedLocale,
    messages: await getMessages(resolvedLocale),
  };
});
