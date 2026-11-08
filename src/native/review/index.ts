import { IS_NATIVE_APP } from '../platform';

/**
 * The store rating prompt in the native apps (docs/native-apps.md §8): the
 * system's own sheet (StoreKit on iOS, Play In-App Review on Android) through
 * `@capacitor-community/in-app-review`. Call sites report moments; the rules
 * in `reviewPolicy.ts` decide whether one is a good time to ask:
 *
 * - `noteFinishedShow()`: a contest reached its winner's celebration.
 * - `askForReviewSoon()`: right after a success (the winner card closed, a
 *   result image shared or saved), never during one.
 * - `noteReviewSetback()`: something went wrong; no prompt this session.
 *
 * Everything here does nothing on the website. The store, the rules and
 * Capacitor load lazily, so they stay out of the website's bundle.
 */

/** The success the user just had. */
export type ReviewMoment = 'winner-closed' | 'image-shared';

/** Let the screen settle (the setup hub opening, the share sheet closing). */
const ASK_DELAY_MS: Record<ReviewMoment, number> = {
  'winner-closed': 1500,
  'image-shared': 1000,
};

let hadSetback = false;
let askTimer: number | null = null;

/**
 * Development only: with `localStorage['dp-review-debug'] = '1'` every
 * moment asks, whatever the rules say, and each decision is logged. iOS
 * builds run from Xcode always show the sheet (it can't submit); TestFlight
 * never does; Android only shows it in a build installed from Play.
 */
function isDebugEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') return false;

  try {
    return window.localStorage.getItem('dp-review-debug') === '1';
  } catch {
    return false;
  }
}

const debugLog = (...args: unknown[]) => {
  if (isDebugEnabled()) console.info('[review]', ...args);
};

/** An error toast or the error screen: no rating prompt this session. */
export function noteReviewSetback(): void {
  if (!IS_NATIVE_APP) return;
  hadSetback = true;
  if (askTimer !== null) {
    window.clearTimeout(askTimer);
    askTimer = null;
  }
}

/** A contest reached its winner's celebration. */
export function noteFinishedShow(): void {
  if (!IS_NATIVE_APP) return;

  void (async () => {
    const [{ useReviewStore }, { recordFinishedShow }] = await Promise.all([
      import('./reviewStore'),
      import('./reviewPolicy'),
    ]);

    useReviewStore
      .getState()
      .update((memory) => recordFinishedShow(memory, Date.now()));
    debugLog('finished show', useReviewStore.getState().finishedShows);
  })().catch((error) => console.warn('Review memory failed:', error));
}

/** Ask for a rating shortly after this success, if the rules allow it. */
export function askForReviewSoon(moment: ReviewMoment): void {
  if (!IS_NATIVE_APP || hadSetback || askTimer !== null) return;

  askTimer = window.setTimeout(() => {
    askTimer = null;
    void askForReview(moment);
  }, ASK_DELAY_MS[moment]);
}

async function askForReview(moment: ReviewMoment): Promise<void> {
  try {
    if (hadSetback || document.visibilityState !== 'visible') return;

    const { Capacitor } = await import('@capacitor/core');

    if (
      !Capacitor.isNativePlatform() ||
      !Capacitor.isPluginAvailable('InAppReview')
    ) {
      debugLog(moment, 'no native review plugin');

      return;
    }

    const [{ App }, { useReviewStore, pickReviewMemory }, policy] =
      await Promise.all([
        import('@capacitor/app'),
        import('./reviewStore'),
        import('./reviewPolicy'),
      ]);
    const { version } = await App.getInfo();
    const now = Date.now();
    const memory = pickReviewMemory(useReviewStore.getState());
    const allowed = policy.shouldAskForReview(memory, {
      now,
      appVersion: version,
      hadSetback,
    });

    debugLog(moment, allowed ? 'asking' : 'not now', memory);
    if (!allowed && !isDebugEnabled()) return;

    // Counted before the call: the system may show nothing and never says.
    useReviewStore
      .getState()
      .update((current) =>
        policy.markAsked(current, { now, appVersion: version }),
      );

    const { InAppReview } = await import('@capacitor-community/in-app-review');

    await InAppReview.requestReview();
  } catch (error) {
    // Android rejects outside a Play install (sideloads, emulators without
    // Play). Nothing for the user to see.
    console.warn('In-app review failed:', error);
  }
}
