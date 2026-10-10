import { IS_NATIVE_APP } from '@/native/platform';

/** The public website, which every share link points to from the apps. */
export const PUBLIC_SITE_URL = 'https://douzepoints.app/';

/**
 * Query keys of share links, in the order they are looked for. Universal
 * links and Android App Links open the apps only for these
 * (`public/.well-known/apple-app-site-association`, AndroidManifest.xml);
 * `shareUrl.test.ts` keeps the three lists in sync.
 */
export const SHARE_PARAM_KEYS = [
  'profile',
  'contest',
  'theme',
  'design',
] as const;

export type ShareParamKey = (typeof SHARE_PARAM_KEYS)[number];

/** The share parameter of a link (`?contest=…`, …), if it has one. */
export function findShareParam(
  url: URL,
): { key: ShareParamKey; value: string } | null {
  for (const key of SHARE_PARAM_KEYS) {
    const value = url.searchParams.get(key);

    if (value) return { key, value };
  }

  return null;
}

/**
 * `url` parsed when it points to the public website (a link that opened the
 * app), else null.
 */
export function parsePublicSiteUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);

    return parsed.origin === new URL(PUBLIC_SITE_URL).origin ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * A link to the app's main page with the given query (`?theme=…`,
 * `?contest=…`, …). On the website it keeps the current origin, so links made
 * on a preview or local build open there; the apps run at
 * `capacitor://localhost` / `https://localhost`, which mean nothing to the
 * recipient, so they link to the public website instead.
 */
export function buildShareUrl(params: Record<string, string> = {}): string {
  const url = new URL(
    IS_NATIVE_APP
      ? PUBLIC_SITE_URL
      : `${window.location.origin}${window.location.pathname}`,
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
