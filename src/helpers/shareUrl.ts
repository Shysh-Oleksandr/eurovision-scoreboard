import { IS_NATIVE_APP } from '@/native/platform';

/** The public website, which every share link points to from the apps. */
export const PUBLIC_SITE_URL = 'https://douzepoints.app/';

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
