import { RefObject, useEffect, useState } from 'react';

import { useGeneralStore } from '@/state/generalStore';
import { getReadableForegroundColor } from '@/theme/themeUtils';

/**
 * Resolve a readable foreground color (white, or a dark on-hue color) for an
 * element whose active/selected fill is driven by a theme CSS variable such as
 * `--twc-primary-700`.
 *
 * It reads the *computed* variable at the element, so it honors both the globally
 * applied theme and any `data-theme="custom-preview"` subtree the element sits
 * in. It re-reads when the applied theme changes (store) and when the live
 * preview palette is re-injected into the theme <style> tags.
 *
 * Every `Badge`/`Tabs` used to install its own `MutationObserver` on the whole
 * `document.head` — dozens of always-on observers, each forcing a
 * `getComputedStyle` reflow on every head/theme mutation (a big cost while the
 * theme editor rewrites the preview <style> on each color tweak). They now share
 * a SINGLE module-level observer that coalesces all reads into one frame and
 * disconnects entirely once the last subscriber unmounts.
 */

type Subscriber = {
  el: HTMLElement;
  cssVar: string;
  setColor: (color: string) => void;
  last: string;
};

const subscribers = new Set<Subscriber>();
let observer: MutationObserver | null = null;
let rafId = 0;

const readSubscriber = (s: Subscriber): void => {
  if (!s.el.isConnected) return;

  const raw = getComputedStyle(s.el).getPropertyValue(s.cssVar).trim();

  if (!raw) return;

  const next = getReadableForegroundColor(raw);

  if (next !== s.last) {
    s.last = next;
    s.setColor(next);
  }
};

// One forced reflow at most: the first getComputedStyle recomputes styles, the
// rest in the same frame read the already-clean values.
const readAll = (): void => {
  rafId = 0;
  subscribers.forEach(readSubscriber);
};

const scheduleRead = (): void => {
  if (typeof window === 'undefined' || rafId) return;
  rafId = window.requestAnimationFrame(readAll);
};

const ensureObserver = (): void => {
  if (observer || typeof window === 'undefined') return;

  // The custom/preview palettes live in injected <style> tags whose text
  // changes as the user tweaks hue/shade; watching document.head catches both
  // those edits and the tags being created/removed. documentElement attrs catch
  // year switches (data-theme) and the --prim-hue inline style.
  observer = new MutationObserver(scheduleRead);
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'style'],
  });
};

const subscribe = (subscriber: Subscriber): (() => void) => {
  subscribers.add(subscriber);
  ensureObserver();

  return () => {
    subscribers.delete(subscriber);

    if (subscribers.size === 0 && observer) {
      observer.disconnect();
      observer = null;

      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }
  };
};

export function useReadableForegroundFromCssVar(
  ref: RefObject<HTMLElement | null>,
  cssVar: string,
): string {
  const [color, setColor] = useState('#ffffff');

  // Applied-theme changes that don't re-inject a <style> tag (year switches).
  const themeYear = useGeneralStore((s) => s.themeYear);
  const customThemeId = useGeneralStore((s) => s.customTheme?._id);

  useEffect(() => {
    const el = ref.current;

    if (!el || typeof window === 'undefined') return;

    const subscriber: Subscriber = { el, cssVar, setColor, last: '' };

    // Read synchronously on mount / theme change so there's no one-frame flash
    // of the default color, then let the shared observer push future updates.
    readSubscriber(subscriber);

    return subscribe(subscriber);
  }, [ref, cssVar, themeYear, customThemeId]);

  return color;
}
