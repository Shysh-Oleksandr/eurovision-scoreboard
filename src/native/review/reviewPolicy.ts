/**
 * When the apps ask for a store rating (docs/native-apps.md §8). Pure, so
 * the rules are tested on their own (reviewPolicy.test.ts); `index.ts` feeds
 * them the device's state.
 *
 * - Only people who came back for more: three finished contests, or
 *   contests finished on two different days.
 * - Not after something went wrong in this session (an error toast, the
 *   error screen).
 * - At most once per app version, four months apart, three times in all.
 *   The stores throttle on top of this (iOS: three prompts a year) and never
 *   say whether the prompt appeared, so an ask counts when it is made.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_FINISHED_SHOWS = 3;
export const MIN_SHOW_DAYS = 2;
export const ASK_GAP_MS = 120 * DAY_MS;
export const MAX_ASKS = 3;

export interface ReviewMemory {
  /** Contests seen through to the winner's celebration. */
  finishedShows: number;
  /** Local days (YYYY-MM-DD) a contest was finished on, the latest few. */
  showDays: string[];
  asks: number;
  lastAskAt: number | null;
  /** The app version (CFBundleShortVersionString / versionName) last asked in. */
  lastAskVersion: string | null;
}

export const INITIAL_REVIEW_MEMORY: ReviewMemory = {
  finishedShows: 0,
  showDays: [],
  asks: 0,
  lastAskAt: null,
  lastAskVersion: null,
};

export interface ReviewAskContext {
  now: number;
  appVersion: string;
  /** Something went wrong in this session. */
  hadSetback: boolean;
}

/** The device's local calendar day, so "came back another day" means it. */
export function localDay(now: number): string {
  const date = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function recordFinishedShow(
  memory: ReviewMemory,
  now: number,
): ReviewMemory {
  const day = localDay(now);
  const showDays = memory.showDays.includes(day)
    ? memory.showDays
    : [...memory.showDays, day].slice(-MIN_SHOW_DAYS);

  return { ...memory, finishedShows: memory.finishedShows + 1, showDays };
}

/** Enough use to have an opinion worth asking for. */
export function isEngaged(memory: ReviewMemory): boolean {
  return (
    memory.finishedShows >= MIN_FINISHED_SHOWS ||
    memory.showDays.length >= MIN_SHOW_DAYS
  );
}

export function shouldAskForReview(
  memory: ReviewMemory,
  context: ReviewAskContext,
): boolean {
  if (context.hadSetback || !isEngaged(memory)) return false;
  if (memory.asks >= MAX_ASKS) return false;
  if (memory.lastAskVersion === context.appVersion) return false;
  // A clock set back counts as too soon.
  if (
    memory.lastAskAt !== null &&
    context.now - memory.lastAskAt < ASK_GAP_MS
  ) {
    return false;
  }

  return true;
}

export function markAsked(
  memory: ReviewMemory,
  context: Pick<ReviewAskContext, 'now' | 'appVersion'>,
): ReviewMemory {
  return {
    ...memory,
    asks: memory.asks + 1,
    lastAskAt: context.now,
    lastAskVersion: context.appVersion,
  };
}
