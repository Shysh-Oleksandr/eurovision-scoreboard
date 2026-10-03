import { useEffect } from 'react';

import { useGeneralStore } from '@/state/generalStore';

/** The modal surface (`dp-surface-modal` starts at `--p-900`). */
const SURFACE_VAR = '--p-900';

/**
 * Resolve any CSS color (the tokens are `oklch(…)` with `calc()` inside) to
 * `#rrggbb`: a probe element lets the engine compute it, a 1×1 canvas
 * converts it to sRGB. `theme-color` support for modern color syntax varies,
 * hex is safe everywhere.
 */
const resolveCssVarToHex = (cssVar: string): string | null => {
  const probe = document.createElement('span');

  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${cssVar})`;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;

  probe.remove();

  const ctx = document.createElement('canvas').getContext('2d');

  if (!computed || !ctx) return null;

  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Keeps `<meta name="theme-color">` on the active theme's modal surface.
 *
 * iOS 26 standalone web apps draw a Liquid Glass blur band over a
 * `black-translucent` status bar and come up short at the bottom by the top
 * inset (WebKit bug 301108), so the app uses the opaque `default` status bar,
 * which iOS (and Android Chrome's toolbar) tint from `theme-color`. The
 * colour has to follow the theme, so it is rewritten whenever the year,
 * the custom theme or the interface variables on `<html>` change.
 */
export const useStatusBarThemeColor = () => {
  const themeYear = useGeneralStore((s) => s.themeYear);
  const customThemeId = useGeneralStore((s) => s.customTheme?._id);

  useEffect(() => {
    let rafId = 0;

    const apply = () => {
      rafId = 0;
      const color = resolveCssVarToHex(SURFACE_VAR);

      if (!color) return;

      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );

      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }

      if (meta.content !== color) meta.content = color;
    };

    const schedule = () => {
      if (!rafId) rafId = window.requestAnimationFrame(apply);
    };

    apply();

    const observer = new MutationObserver(schedule);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'class'],
    });

    return () => {
      observer.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [themeYear, customThemeId]);
};
