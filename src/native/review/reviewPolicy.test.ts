import { describe, expect, it } from 'vitest';

import {
  ASK_GAP_MS,
  INITIAL_REVIEW_MEMORY,
  isEngaged,
  localDay,
  markAsked,
  MAX_ASKS,
  recordFinishedShow,
  type ReviewAskContext,
  type ReviewMemory,
  shouldAskForReview,
} from './reviewPolicy';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Local time, so the day boundaries are the device's.
const NOON = new Date(2026, 10, 16, 12).getTime();

const memory = (extra: Partial<ReviewMemory> = {}): ReviewMemory => ({
  ...INITIAL_REVIEW_MEMORY,
  ...extra,
});

const ctx = (extra: Partial<ReviewAskContext> = {}): ReviewAskContext => ({
  now: NOON,
  appVersion: '1.3',
  hadSetback: false,
  ...extra,
});

const finishShows = (times: number[], start = memory()): ReviewMemory =>
  times.reduce((m, at) => recordFinishedShow(m, at), start);

describe('localDay', () => {
  it('uses the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
    expect(localDay(new Date(2026, 0, 6, 0, 1).getTime())).toBe('2026-01-06');
  });
});

describe('recordFinishedShow', () => {
  it('counts shows and keeps the latest distinct days', () => {
    const m = finishShows([NOON, NOON + HOUR, NOON + DAY, NOON + 3 * DAY]);

    expect(m.finishedShows).toBe(4);
    expect(m.showDays).toEqual(['2026-11-17', '2026-11-19']);
  });
});

describe('isEngaged', () => {
  it('needs three shows on one day', () => {
    expect(isEngaged(finishShows([NOON, NOON + HOUR]))).toBe(false);
    expect(isEngaged(finishShows([NOON, NOON + HOUR, NOON + 2 * HOUR]))).toBe(
      true,
    );
  });

  it('or shows on two different days', () => {
    expect(isEngaged(finishShows([NOON]))).toBe(false);
    expect(isEngaged(finishShows([NOON, NOON + DAY]))).toBe(true);
  });
});

describe('shouldAskForReview', () => {
  const engaged = finishShows([NOON - DAY, NOON]);

  it('asks an engaged user who was never asked', () => {
    expect(shouldAskForReview(engaged, ctx())).toBe(true);
  });

  it('waits for engagement', () => {
    expect(shouldAskForReview(finishShows([NOON]), ctx())).toBe(false);
  });

  it('never after a setback in the session', () => {
    expect(shouldAskForReview(engaged, ctx({ hadSetback: true }))).toBe(false);
  });

  it('once per app version', () => {
    const asked = markAsked(engaged, { now: NOON, appVersion: '1.3' });
    const later = NOON + ASK_GAP_MS + DAY;

    expect(shouldAskForReview(asked, ctx({ now: later }))).toBe(false);
    expect(
      shouldAskForReview(asked, ctx({ now: later, appVersion: '1.4' })),
    ).toBe(true);
  });

  it('keeps asks apart, also when the clock goes back', () => {
    const asked = markAsked(engaged, { now: NOON, appVersion: '1.3' });
    const next = ctx({ appVersion: '1.4' });

    expect(shouldAskForReview(asked, { ...next, now: NOON + 30 * DAY })).toBe(
      false,
    );
    expect(shouldAskForReview(asked, { ...next, now: NOON - DAY })).toBe(false);
    expect(shouldAskForReview(asked, { ...next, now: NOON + ASK_GAP_MS })).toBe(
      true,
    );
  });

  it(`stops after ${MAX_ASKS} asks`, () => {
    let m = engaged;

    for (let i = 0; i < MAX_ASKS; i += 1) {
      m = markAsked(m, {
        now: NOON + i * ASK_GAP_MS,
        appVersion: `1.${i}`,
      });
    }

    expect(
      shouldAskForReview(
        m,
        ctx({ now: NOON + 10 * ASK_GAP_MS, appVersion: '9.0' }),
      ),
    ).toBe(false);
  });
});
