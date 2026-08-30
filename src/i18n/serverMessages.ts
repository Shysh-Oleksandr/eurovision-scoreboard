import { deepMergeMessages, SupportedLocale } from './catalog';

/**
 * Server-side merged catalog access, shared by the next-intl request config
 * (metadata + SSR shell messages) and the /api/messages fallback route.
 * The en+locale deep merge produces a ~70 KB structure and is otherwise
 * repeated on every request; cache it per locale for the life of the isolate.
 */
const mergedMessagesCache = new Map<SupportedLocale, any>();

export async function getMergedMessages(locale: SupportedLocale) {
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
