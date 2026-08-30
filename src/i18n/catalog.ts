/**
 * Pure, dependency-free i18n catalog helpers shared by the server request
 * config, the client catalog provider, the /api/messages route and the
 * build-time generator (scripts/generateMessages.ts). Keep this file free of
 * imports that reach the message JSONs — client code imports it for the
 * types and helpers only.
 */

export const SUPPORTED_LOCALES = [
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

export const DEFAULT_LOCALE: SupportedLocale = 'en';

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

export function deepMergeMessages(base: any, override: any): any {
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

/**
 * The namespaces the document still inlines (a few KB) so everything that
 * can render BEFORE the client has fetched the full catalog stays
 * translated. Inventory of pre-catalog consumers — keep in sync:
 * - `Metadata` — generateMetadata in app/layout.tsx (server-side only)
 * - `widgets.profile` — AppBootstrap's login toasts (SSR'd every request)
 * - `settings.ui` — ThemeSoundVolumeHud (hook runs above its null-gate)
 * - `error` + `common` — app/error.tsx (error boundary can render any time)
 */
export const SHELL_NAMESPACES = [
  'Metadata',
  'common',
  'error',
  'widgets.profile',
  'settings.ui',
] as const;

/** Extracts a subset of dotted namespace paths, preserving nesting. */
export function pickMessageNamespaces(
  messages: any,
  paths: readonly string[],
): any {
  const result: any = {};

  for (const path of paths) {
    const segments = path.split('.');
    let source: any = messages;

    for (const segment of segments) {
      source = source?.[segment];
      if (source === undefined) break;
    }
    if (source === undefined) continue;

    let target = result;

    for (let i = 0; i < segments.length - 1; i += 1) {
      target[segments[i]] ??= {};
      target = target[segments[i]];
    }
    target[segments[segments.length - 1]] = source;
  }

  return result;
}
