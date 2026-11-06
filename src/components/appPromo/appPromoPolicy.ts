import {
  ANDROID_PACKAGE,
  APP_PROMO_CAMPAIGN_DAYS,
  APP_URL_SCHEME,
  type AppStore,
  PLAY_STORE_URL,
} from '@/config/appStores';
import type { ShareParamKey } from '@/helpers/shareUrl';

/**
 * When the website shows the app announcement (the setup hub card) and the
 * reminder after a show. Pure, so the rules are tested on their own
 * (appPromoPolicy.test.ts); `useAppPromo.ts` feeds them the browser's state.
 *
 * - The card: from the release until the campaign ends. "Not now" ends it on
 *   desktop; a phone gets it back once after three weeks. Following a store
 *   link doesn't hide it: people close it themselves.
 * - Android with the app installed gets an "Open the app" row instead, until
 *   it is dismissed once (no campaign window: it is a shortcut, not news).
 * - The reminder (phones, in the winner modal): at most twice, a month
 *   apart, until the card is over for good.
 * - Nothing for an account that has signed in on the app.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const CARD_SNOOZE_MS = 21 * DAY_MS;
export const REMINDER_GAP_MS = 30 * DAY_MS;
export const MAX_REMINDERS = 2;

export type DevicePlatform = 'ios' | 'android' | 'desktop';

/** Which store this device installs from; desktop gets both. */
export function detectDevicePlatform(
  userAgent: string,
  maxTouchPoints = 0,
): DevicePlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  // iPadOS Safari asks for desktop pages with a Mac user agent.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';

  return 'desktop';
}

/** The stores to offer on a platform, in display order. */
export function storesFor(platform: DevicePlatform): AppStore[] {
  if (platform === 'ios') return ['app-store'];
  if (platform === 'android') return ['google-play'];

  return ['app-store', 'google-play'];
}

export interface AppPromoMemory {
  /** "Not now" taps on the hub card. */
  cardDismissals: number;
  /** The snoozed card comes back at this time (ms). */
  cardHiddenUntil: number | null;
  /** The card was dismissed for good (see `dismissCard`). */
  done: boolean;
  /** The "Open the app" row (Android, app installed) was dismissed. */
  openRowDismissed: boolean;
  remindersShown: number;
  lastReminderAt: number | null;
}

export const INITIAL_APP_PROMO_MEMORY: AppPromoMemory = {
  cardDismissals: 0,
  cardHiddenUntil: null,
  done: false,
  openRowDismissed: false,
  remindersShown: 0,
  lastReminderAt: null,
};

export interface AppPromoContext {
  /** `APP_STORES_RELEASE_DATE` on the website, null before it (or in the apps). */
  releaseDate: string | null;
  now: number;
  platform: DevicePlatform;
  /**
   * Android: whether the app is installed (`getInstalledRelatedApps`), null
   * while that is being checked. Always false elsewhere: iOS can't tell.
   */
  installed: boolean | null;
  /** The signed-in account has signed in on the app. */
  hasAppAccount: boolean;
}

export type HubCardVariant = 'announce' | 'open';

export function campaignEndsAt(releaseDate: string): number {
  return (
    Date.parse(`${releaseDate}T00:00:00Z`) + APP_PROMO_CAMPAIGN_DAYS * DAY_MS
  );
}

const inCampaign = (
  ctx: AppPromoContext,
): ctx is AppPromoContext & {
  releaseDate: string;
} => ctx.releaseDate !== null && ctx.now < campaignEndsAt(ctx.releaseDate);

export function hubCardVariant(
  memory: AppPromoMemory,
  ctx: AppPromoContext,
): HubCardVariant | null {
  if (ctx.releaseDate === null || ctx.installed === null) return null;

  if (ctx.installed) return memory.openRowDismissed ? null : 'open';

  if (memory.done || ctx.hasAppAccount || !inCampaign(ctx)) return null;

  if (memory.cardHiddenUntil !== null && ctx.now < memory.cardHiddenUntil) {
    return null;
  }

  return 'announce';
}

/** "Not now" on the announcement. */
export function dismissCard(
  memory: AppPromoMemory,
  platform: DevicePlatform,
  now: number,
): AppPromoMemory {
  const cardDismissals = memory.cardDismissals + 1;
  // A desktop can't install the app anyway; a phone gets one more look.
  const final = platform === 'desktop' || cardDismissals >= 2;

  return {
    ...memory,
    cardDismissals,
    cardHiddenUntil: final ? null : now + CARD_SNOOZE_MS,
    done: memory.done || final,
  };
}

export function isReminderDue(
  memory: AppPromoMemory,
  ctx: AppPromoContext,
): boolean {
  if (ctx.platform === 'desktop' || ctx.installed !== false) return false;

  if (memory.done || ctx.hasAppAccount || !inCampaign(ctx)) return false;

  if (memory.remindersShown >= MAX_REMINDERS) return false;

  return (
    memory.lastReminderAt === null ||
    ctx.now - memory.lastReminderAt >= REMINDER_GAP_MS
  );
}

export function markReminderShown(
  memory: AppPromoMemory,
  now: number,
): AppPromoMemory {
  return {
    ...memory,
    remindersShown: memory.remindersShown + 1,
    lastReminderAt: now,
  };
}

/**
 * Chrome's intent link to the installed Android app: the custom scheme
 * (`app.douzepoints://open?contest=…`, handled by src/native/appLinks.ts)
 * with the Play listing as the fallback when the app is missing. Carries the
 * share link the page was opened with, so the app opens the same item.
 */
export function androidOpenAppUrl(
  share: { key: ShareParamKey; value: string } | null,
): string {
  const query = share ? `?${share.key}=${encodeURIComponent(share.value)}` : '';

  return `intent://open${query}#Intent;scheme=${APP_URL_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(
    PLAY_STORE_URL,
  )};end`;
}
