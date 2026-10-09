import type { SupportedLocale } from './catalog';
import { MESSAGES_CATALOG } from './messagesManifest.generated';

/**
 * URL of a locale's full message catalog: the hashed static JSON generated
 * by the prebuild (immutably cached, and bundled into the native apps), or
 * the always-current API route in dev, which runs without the prebuild.
 */
export const catalogUrlFor = (locale: SupportedLocale): string =>
  process.env.NODE_ENV === 'development'
    ? `/api/messages/${locale}`
    : MESSAGES_CATALOG[locale].url;
