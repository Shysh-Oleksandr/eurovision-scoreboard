import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { normalizeLocale, SUPPORTED_LOCALES, SupportedLocale } from './catalog';
import { getMergedMessages } from './serverMessages';

// Re-exported for existing importers (app/api/locale/route.ts).
export { normalizeLocale };
export type { SupportedLocale };

function parseAcceptLanguage(value: string | null): SupportedLocale {
  if (!value) return 'en';

  const parts = value.split(',');

  for (const part of parts) {
    const [tag] = part.trim().split(';');
    const locale = normalizeLocale(tag);

    if (SUPPORTED_LOCALES.includes(locale)) {
      return locale;
    }
  }

  return 'en';
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

  // The full merged catalog stays available server-side (generateMetadata,
  // getTranslations). It no longer reaches the flight payload: the layout
  // passes the client provider an explicit shell subset instead (see
  // AppIntlProvider), and the client fetches the full catalog as a hashed
  // static JSON.
  return {
    locale: resolvedLocale,
    messages: await getMergedMessages(resolvedLocale),
  };
});
