/**
 * A brake for layout effects that measure, set state and measure again (the
 * phone board's column fit). Each pass re-renders and commits before the
 * browser paints, so passes that keep feeding each other never let the frame
 * end: React gives up after 50 nested updates (minified error #185) and the
 * app lands on the error page. One report came from an iPhone with a
 * 393 × 267 window (2026-11-15), cause unknown.
 */

/**
 * Passes allowed per frame. A normal fit takes at most two per step, three
 * steps, so this only stops a loop, well before React's 50.
 */
export const MAX_FIT_PASSES_PER_FRAME = 16;

/**
 * Counts passes in the current frame. `spend()` answers whether one more may
 * run; the count starts over at the next animation frame.
 */
export function createFramePassBudget(
  limit = MAX_FIT_PASSES_PER_FRAME,
  nextFrame: (callback: () => void) => void = (callback) =>
    window.requestAnimationFrame(callback),
) {
  let used = 0;
  let resetScheduled = false;

  return {
    spend(): boolean {
      if (!resetScheduled) {
        resetScheduled = true;
        nextFrame(() => {
          used = 0;
          resetScheduled = false;
        });
      }
      used += 1;

      return used <= limit;
    },
  };
}

let reported = false;

/**
 * Posts the state a stopped loop was in, once per page load, so the cause
 * can be found. Not a crash: the board keeps its last layout.
 */
export function reportFitLoop(details: Record<string, unknown>): void {
  if (reported) return;
  reported = true;

  void import('@/api/client')
    .then(({ api }) =>
      api.post('/errors', {
        message: 'Board fit loop stopped (phone)',
        userDetails: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        },
        generalInfo: {
          ...details,
          visualViewport: window.visualViewport && {
            width: Math.round(window.visualViewport.width),
            height: Math.round(window.visualViewport.height),
            scale: window.visualViewport.scale,
          },
        },
      }),
    )
    .catch(() => {});
}
