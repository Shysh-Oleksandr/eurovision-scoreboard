import { IS_NATIVE_APP } from '@/native/platform';

/**
 * The iOS and Android apps in the stores, and how the website points to them
 * (docs/native-apps.md §13).
 *
 * The website's store links stay off until `NEXT_PUBLIC_APP_STORES_LIVE`
 * holds the public release date (`2026-11-12`): set it in the Workers Builds
 * variables (and `.env` for CLI deploys) once both listings are public, then
 * rebuild. The date dates the What's new entry and starts the setup hub's
 * announcement window.
 */
const releaseDate = process.env.NEXT_PUBLIC_APP_STORES_LIVE ?? '';

export const APP_STORES_RELEASE_DATE: string | null =
  /^\d{4}-\d{2}-\d{2}$/.test(releaseDate) ? releaseDate : null;

/**
 * The website shows the store links: the Smart App Banner, the setup hub
 * card, the reminder after a show, Settings, About and /get-app. Never in the
 * apps themselves.
 */
export const APP_STORES_LIVE =
  APP_STORES_RELEASE_DATE !== null && !IS_NATIVE_APP;

/** The numeric Apple ID from App Store Connect (App Information). */
export const APP_STORE_ID = '6821299332';

/** The bundle ID / package name (capacitor.config.ts `appId`). */
export const ANDROID_PACKAGE = 'app.douzepoints';

export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * The share-anywhere link: phones go straight to their store, other devices
 * get both badges and a QR code (src/app/get-app).
 */
export const GET_APP_PATH = '/get-app';
export const GET_APP_URL = `https://douzepoints.app${GET_APP_PATH}`;

/**
 * The Android app's custom URL scheme (`custom_url_scheme` in strings.xml,
 * the AndroidManifest filter with host `open`): "Open the app" on the website
 * launches the installed app through it.
 */
export const APP_URL_SCHEME = 'app.douzepoints';

/** The setup hub announces the apps for this long after the release. */
export const APP_PROMO_CAMPAIGN_DAYS = 60;

export type AppStore = 'app-store' | 'google-play';

const BADGE_LOCALES = ['en', 'es', 'fr', 'uk', 'de', 'pl', 'it', 'gr', 'pt'];

/**
 * The official store badge in the app's language (public/img/store-badges/,
 * downloaded from Apple's and Google's badge pages; Apple has no Ukrainian
 * badge, so `uk` is the English one). Google's PNGs are trimmed to the badge
 * itself, so both badges line up at the same height.
 */
export function storeBadgeSrc(store: AppStore, locale: string): string {
  const badgeLocale = BADGE_LOCALES.includes(locale) ? locale : 'en';

  return store === 'app-store'
    ? `/img/store-badges/app-store/${badgeLocale}.svg`
    : `/img/store-badges/google-play/${badgeLocale}.png`;
}
