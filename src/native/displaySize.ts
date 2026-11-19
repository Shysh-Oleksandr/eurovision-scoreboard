/**
 * The apps' "Display size" setting (docs/native-apps.md §8): the whole app
 * smaller, so more fits on the screen, the way Safari's page zoom shrinks a
 * website. At 75% a 402pt-wide phone lays the page out 536px wide, so the
 * setup hub shows three columns of countries instead of two.
 *
 * The page does it with its viewport tag: an initial, minimum and maximum
 * scale of the zoom. Both engines then widen the layout to the screen width
 * divided by the zoom and draw it scaled down, so media queries, `vw`/`dvh`
 * and every measured layout see the bigger viewport, unlike CSS `zoom`.
 * WKWebView honours the tag as it is (WKWebView's `pageZoom` doesn't widen
 * the layout); Android's WebView only with its wide viewport on, which the
 * `DouzeDisplay` plugin turns on.
 *
 * Next renders the tag from `viewport` in src/app/layout.tsx and puts it back
 * when it renders the head, so a MutationObserver keeps ours. Safe-area
 * insets come in unscaled CSS px from both engines (and from Capacitor's
 * `--safe-area-inset-*`), so styles.css divides `--safe-*` by
 * `--dp-display-zoom`.
 */
import { IS_NATIVE_APP, nativePlatform } from './platform';

export const DISPLAY_SIZES = ['75', '85', '100'] as const;
export type DisplaySize = (typeof DISPLAY_SIZES)[number];
export const DEFAULT_DISPLAY_SIZE: DisplaySize = '100';

/** '85' → 0.85; anything that isn't an offered size is 1. */
export function zoomForDisplaySize(size: string | undefined): number {
  return size && (DISPLAY_SIZES as readonly string[]).includes(size)
    ? Number(size) / 100
    : 1;
}

/**
 * The viewport tag for a zoom: the app's own (src/app/layout.tsx) with every
 * scale set to it. The minimum matters on the way back to 100%: with only a
 * maximum, the page would keep the smaller scale.
 */
export function viewportContent(zoom: number): string {
  return `width=device-width, initial-scale=${zoom}, minimum-scale=${zoom}, maximum-scale=${zoom}, viewport-fit=cover, user-scalable=no`;
}

/**
 * Whether this app can change its size: every iOS binary, and Android
 * binaries with the `DouzeDisplay` plugin. Never the website, where the
 * browser has its own zoom.
 */
export function isDisplaySizeSupported(): boolean {
  if (!IS_NATIVE_APP || typeof window === 'undefined') return false;

  const platform = nativePlatform();

  if (platform === 'ios') return true;

  if (platform !== 'android') return false;

  const capacitor = (
    window as {
      Capacitor?: { isPluginAvailable?: (name: string) => boolean };
    }
  ).Capacitor;

  return capacitor?.isPluginAvailable?.('DouzeDisplay') === true;
}

let wanted: string | null = null;
let keeper: MutationObserver | null = null;

/** Puts the wanted content back on every viewport tag that lost it. */
function enforceViewport(): void {
  if (wanted === null) return;

  const content = wanted;

  document.querySelectorAll('meta[name="viewport"]').forEach((meta) => {
    if (meta.getAttribute('content') !== content) {
      meta.setAttribute('content', content);
    }
  });
}

/**
 * Applies a zoom to the page. Until the first zoom other than 1, a 100% size
 * leaves the viewport tag exactly as the app ships it; after that the tag is
 * ours for the rest of the session.
 */
export function applyDisplayZoom(zoom: number): void {
  if (typeof document === 'undefined') return;
  if (wanted === null && zoom === 1) return;

  wanted = viewportContent(zoom);
  document.documentElement.style.setProperty('--dp-display-zoom', `${zoom}`);
  enforceViewport();

  if (!keeper && typeof MutationObserver !== 'undefined') {
    keeper = new MutationObserver(enforceViewport);
    keeper.observe(document.head, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['content'],
    });
  }
}

/** Test seam: forget the applied zoom and stop keeping the tag. */
export function resetDisplayZoomForTests(): void {
  keeper?.disconnect();
  keeper = null;
  wanted = null;
  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty('--dp-display-zoom');
  }
}
