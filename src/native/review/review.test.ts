import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_REVIEW_MEMORY, type ReviewMemory } from './reviewPolicy';

const { requestReview } = vi.hoisted(() => ({ requestReview: vi.fn() }));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) => name === 'InAppReview',
  },
}));
vi.mock('@capacitor/app', () => ({
  App: { getInfo: async () => ({ version: '1.3' }) },
}));
vi.mock('@capacitor-community/in-app-review', () => ({
  InAppReview: { requestReview },
}));

const STORAGE_KEY = 'review-prompt-storage';
const DAY = 24 * 60 * 60 * 1000;

const saveMemory = (memory: Partial<ReviewMemory>) =>
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: { ...INITIAL_REVIEW_MEMORY, ...memory },
      version: 0,
    }),
  );

const readMemory = (): ReviewMemory =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').state;

/** A fresh module (its session flags) in the app bundle. */
async function loadReview() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_NATIVE_APP', '1');

  return import('./index');
}

/** Past the moment's delay, with every lazy import settled. */
async function settle() {
  await vi.advanceTimersByTimeAsync(2000);
  await vi.dynamicImportSettled();
  await vi.advanceTimersByTimeAsync(0);
}

const engaged: Partial<ReviewMemory> = {
  finishedShows: 2,
  showDays: ['2026-11-15', '2026-11-16'],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 16, 12));
  localStorage.clear();
  requestReview.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('askForReviewSoon', () => {
  it('asks an engaged user after the moment, and remembers it', async () => {
    saveMemory(engaged);
    const { askForReviewSoon } = await loadReview();
    const start = Date.now();

    askForReviewSoon('winner-closed');
    await vi.advanceTimersByTimeAsync(1000);
    expect(requestReview).not.toHaveBeenCalled();

    await settle();
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(readMemory()).toMatchObject({ asks: 1, lastAskVersion: '1.3' });
    expect(readMemory().lastAskAt).toBeGreaterThanOrEqual(start + 1500);
  });

  it('waits for engagement', async () => {
    saveMemory({ finishedShows: 1, showDays: ['2026-11-16'] });
    const { askForReviewSoon } = await loadReview();

    askForReviewSoon('image-shared');
    await settle();
    expect(requestReview).not.toHaveBeenCalled();
    expect(readMemory().asks).toBe(0);
  });

  it('not again in the same version', async () => {
    saveMemory({
      ...engaged,
      asks: 1,
      lastAskAt: Date.now() - 200 * DAY,
      lastAskVersion: '1.3',
    });
    const { askForReviewSoon } = await loadReview();

    askForReviewSoon('image-shared');
    await settle();
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('not after a setback in the session, even one during the delay', async () => {
    saveMemory(engaged);
    const review = await loadReview();

    review.askForReviewSoon('winner-closed');
    review.noteReviewSetback();
    await settle();
    review.askForReviewSoon('image-shared');
    await settle();
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('swallows a rejected request (no Play install)', async () => {
    saveMemory(engaged);
    requestReview.mockRejectedValue(new Error('Request review task Failed'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { askForReviewSoon } = await loadReview();

    askForReviewSoon('image-shared');
    await settle();
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does nothing on the website', async () => {
    saveMemory(engaged);
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_NATIVE_APP', '');
    const { askForReviewSoon, noteFinishedShow } = await import('./index');

    noteFinishedShow();
    askForReviewSoon('image-shared');
    await settle();
    expect(requestReview).not.toHaveBeenCalled();
    expect(readMemory().finishedShows).toBe(2);
  });
});

describe('noteFinishedShow', () => {
  it('counts the show and its day', async () => {
    const { noteFinishedShow } = await loadReview();

    noteFinishedShow();
    await vi.dynamicImportSettled();
    expect(readMemory()).toMatchObject({
      finishedShows: 1,
      showDays: ['2026-11-16'],
    });
  });
});
