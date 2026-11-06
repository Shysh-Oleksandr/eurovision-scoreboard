import { describe, expect, it } from 'vitest';

import {
  type AppPromoContext,
  type AppPromoMemory,
  androidOpenAppUrl,
  CARD_SNOOZE_MS,
  campaignEndsAt,
  detectDevicePlatform,
  dismissCard,
  hubCardVariant,
  INITIAL_APP_PROMO_MEMORY,
  isReminderDue,
  markReminderShown,
  REMINDER_GAP_MS,
  storesFor,
} from './appPromoPolicy';

const DAY = 24 * 60 * 60 * 1000;
const RELEASE = '2026-11-12';
const LAUNCH = Date.parse(`${RELEASE}T09:00:00Z`);

const ctx = (extra: Partial<AppPromoContext> = {}): AppPromoContext => ({
  releaseDate: RELEASE,
  now: LAUNCH,
  platform: 'ios',
  installed: false,
  hasAppAccount: false,
  ...extra,
});

const memory = (extra: Partial<AppPromoMemory> = {}): AppPromoMemory => ({
  ...INITIAL_APP_PROMO_MEMORY,
  ...extra,
});

describe('detectDevicePlatform', () => {
  it('tells the stores apart by user agent', () => {
    expect(
      detectDevicePlatform(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('ios');
    expect(
      detectDevicePlatform(
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
      ),
    ).toBe('android');
    expect(
      detectDevicePlatform(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      ),
    ).toBe('desktop');
  });

  it('counts an iPad asking for desktop pages as iOS, a Mac as desktop', () => {
    const mac =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

    expect(detectDevicePlatform(mac, 5)).toBe('ios');
    expect(detectDevicePlatform(mac, 0)).toBe('desktop');
  });

  it('offers the matching store, or both on desktop', () => {
    expect(storesFor('ios')).toEqual(['app-store']);
    expect(storesFor('android')).toEqual(['google-play']);
    expect(storesFor('desktop')).toEqual(['app-store', 'google-play']);
  });
});

describe('hubCardVariant', () => {
  it('announces the apps from the release until the campaign ends', () => {
    expect(hubCardVariant(memory(), ctx())).toBe('announce');
    expect(
      hubCardVariant(
        memory(),
        ctx({ now: campaignEndsAt(RELEASE) - 1, platform: 'desktop' }),
      ),
    ).toBe('announce');
    expect(
      hubCardVariant(memory(), ctx({ now: campaignEndsAt(RELEASE) })),
    ).toBe(null);
  });

  it('stays off before the release (or in the apps)', () => {
    expect(hubCardVariant(memory(), ctx({ releaseDate: null }))).toBe(null);
  });

  it('waits for the Android install check', () => {
    expect(
      hubCardVariant(memory(), ctx({ platform: 'android', installed: null })),
    ).toBe(null);
  });

  it('offers "Open the app" on Android when the app is installed, even after the campaign', () => {
    const installed = ctx({
      platform: 'android',
      installed: true,
      now: campaignEndsAt(RELEASE) + 100 * DAY,
    });

    expect(hubCardVariant(memory({ done: true }), installed)).toBe('open');
    expect(hubCardVariant(memory({ openRowDismissed: true }), installed)).toBe(
      null,
    );
  });

  it('skips accounts that have signed in on the app', () => {
    expect(hubCardVariant(memory(), ctx({ hasAppAccount: true }))).toBe(null);
  });

  it('ends once dismissed for good', () => {
    expect(hubCardVariant(memory({ done: true }), ctx())).toBe(null);
  });
});

describe('dismissCard', () => {
  it('ends the announcement on desktop at the first "Not now"', () => {
    const next = dismissCard(memory(), 'desktop', LAUNCH);

    expect(next).toMatchObject({ done: true, cardHiddenUntil: null });
    expect(hubCardVariant(next, ctx({ platform: 'desktop' }))).toBe(null);
  });

  it('snoozes it once on a phone, then ends it', () => {
    const snoozed = dismissCard(memory(), 'ios', LAUNCH);

    expect(snoozed).toMatchObject({
      done: false,
      cardDismissals: 1,
      cardHiddenUntil: LAUNCH + CARD_SNOOZE_MS,
    });
    expect(hubCardVariant(snoozed, ctx({ now: LAUNCH + DAY }))).toBe(null);

    const back = ctx({ now: LAUNCH + CARD_SNOOZE_MS });

    expect(hubCardVariant(snoozed, back)).toBe('announce');

    const ended = dismissCard(snoozed, 'ios', back.now);

    expect(ended.done).toBe(true);
    expect(hubCardVariant(ended, back)).toBe(null);
  });
});

describe('isReminderDue', () => {
  it('is for phones without the app, twice at most, a month apart', () => {
    const first = memory();

    expect(isReminderDue(first, ctx())).toBe(true);

    const once = markReminderShown(first, LAUNCH);

    expect(isReminderDue(once, ctx({ now: LAUNCH + DAY }))).toBe(false);
    expect(isReminderDue(once, ctx({ now: LAUNCH + REMINDER_GAP_MS }))).toBe(
      true,
    );

    const twice = markReminderShown(once, LAUNCH + REMINDER_GAP_MS);

    expect(
      isReminderDue(twice, ctx({ now: LAUNCH + 2 * REMINDER_GAP_MS - DAY })),
    ).toBe(false);
  });

  it('still reminds while the card is only snoozed', () => {
    expect(isReminderDue(dismissCard(memory(), 'ios', LAUNCH), ctx())).toBe(
      true,
    );
  });

  it('never shows on desktop, with the app installed or after the card ended', () => {
    expect(isReminderDue(memory(), ctx({ platform: 'desktop' }))).toBe(false);
    expect(
      isReminderDue(memory(), ctx({ platform: 'android', installed: true })),
    ).toBe(false);
    expect(
      isReminderDue(memory(), ctx({ platform: 'android', installed: null })),
    ).toBe(false);
    expect(isReminderDue(memory({ done: true }), ctx())).toBe(false);
    expect(isReminderDue(memory(), ctx({ hasAppAccount: true }))).toBe(false);
    expect(isReminderDue(memory(), ctx({ now: campaignEndsAt(RELEASE) }))).toBe(
      false,
    );
  });
});

describe('androidOpenAppUrl', () => {
  it('opens the app through its scheme, with Play as the fallback', () => {
    expect(androidOpenAppUrl(null)).toBe(
      'intent://open#Intent;scheme=app.douzepoints;package=app.douzepoints;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dapp.douzepoints;end',
    );
  });

  it('carries the share link the page was opened with', () => {
    expect(androidOpenAppUrl({ key: 'contest', value: 'a b' })).toMatch(
      /^intent:\/\/open\?contest=a%20b#Intent;/,
    );
  });
});
