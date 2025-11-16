import {cookies, headers} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';

const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = 'en';

function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  if (!raw) return DEFAULT_LOCALE;

  const lower = raw.toLowerCase();

  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';

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

  const messages = (await import(`../../messages/${resolvedLocale}.json`))
    .default;

  return {
    locale: resolvedLocale,
    messages,
  };
});
