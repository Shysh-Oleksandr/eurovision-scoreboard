import { APP_URL_SCHEME } from '@/config/appStores';
import { IS_NATIVE_APP } from '@/native/platform';

/** The public website, which every share link points to from the apps. */
export const PUBLIC_SITE_URL = 'https://douzepoints.app/';

/**
 * The legal pages are website-only (`page.web.tsx`, absent from the apps'
 * export), so the apps open them on the public website, in the browser.
 */
export const PRIVACY_POLICY_URL = IS_NATIVE_APP
  ? `${PUBLIC_SITE_URL}privacy`
  : '/privacy';
export const TERMS_OF_USE_URL = IS_NATIVE_APP
  ? `${PUBLIC_SITE_URL}terms`
  : '/terms';
/** Asset credits (the Commons heart flags) on the About page. */
export const CREDITS_URL = IS_NATIVE_APP
  ? `${PUBLIC_SITE_URL}about#credits`
  : '/about#credits';

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
 * The website's "Open the app" link on Android (`app.douzepoints://open`,
 * maybe with a share parameter) as the public website URL with the same
 * query, so the app treats it like the share link it came from; else null.
 */
export function parseAppSchemeUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== `${APP_URL_SCHEME}:` || parsed.host !== 'open') {
      return null;
    }

    const site = new URL(PUBLIC_SITE_URL);

    site.search = parsed.search;

    return site;
  } catch {
    return null;
  }
}

let landingShareParam: { key: ShareParamKey; value: string } | null = null;

/**
 * The share parameter the website was opened with. `useShareLinks` removes
 * it from the address bar once the item is open; "Open the app" still needs
 * it to open the same item in the app.
 */
export function rememberLandingShareParam(url: URL): void {
  landingShareParam = findShareParam(url);
}

export const getLandingShareParam = () => landingShareParam;

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
