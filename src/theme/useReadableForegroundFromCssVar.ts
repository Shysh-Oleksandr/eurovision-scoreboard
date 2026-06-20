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
 * preview palette is re-injected into the theme <style> tags (MutationObserver).
 */
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

    let frame = 0;
    const read = () => {
      frame = 0;
      const raw = getComputedStyle(el).getPropertyValue(cssVar).trim();

      if (raw) setColor(getReadableForegroundColor(raw));
    };
    // Coalesce bursts of mutations into a single read per frame.
    const scheduleRead = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    read();

    // The custom/preview palettes live in injected <style> tags whose text
    // changes as the user tweaks hue/shade; watching document.head catches both
    // those edits and the tags being created/removed.
    const observer = new MutationObserver(scheduleRead);

    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref, cssVar, themeYear, customThemeId]);

  return color;
}
