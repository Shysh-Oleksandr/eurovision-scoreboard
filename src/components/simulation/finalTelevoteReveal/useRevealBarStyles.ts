import { useMemo } from 'react';

import {
  buildBackgroundColorLookup,
  extractSolidColorFromColorValue,
} from '../../countryItem/utils/gradientUtils';

import { RevealBarStyles } from './types';

import { useGeneralStore } from '@/state/generalStore';

// Alpha used for the faded (bottom) stop of the gradient bar — matches the
// legacy hex `50` suffix (0x50 / 255 ≈ 0.314).
const FADE_ALPHA = 0x50 / 255;

/**
 * Applies an alpha to a solid color regardless of its format. The extracted
 * theme color can be hex (`#rrggbb`), `rgb()`/`rgba()`, or `hsl()`/`hsla()`,
 * so a naive hex-suffix (e.g. `${color}50`) would produce an invalid value for
 * the non-hex cases.
 */
const toTranslucent = (color: string, alpha: number): string => {
  const c = color.trim();

  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (c.startsWith('#')) {
    let hex = c.slice(1);

    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }

    const rgb = hex.slice(0, 6).padEnd(6, '0');
    const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
      .toString(16)
      .padStart(2, '0');

    return `#${rgb}${a}`;
  }

  // rgb()/rgba() — comma- or space-separated
  const rgbMatch = c.match(/^rgba?\(\s*([^)]+?)\s*\)$/i);

  if (rgbMatch) {
    const nums = rgbMatch[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3);

    if (nums.length === 3) return `rgba(${nums.join(', ')}, ${alpha})`;
  }

  // hsl()/hsla() — comma- or space-separated
  const hslMatch = c.match(/^hsla?\(\s*([^)]+?)\s*\)$/i);

  if (hslMatch) {
    const parts = hslMatch[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3);

    if (parts.length === 3) {
      return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  }

  return c;
};

/**
 * Resolves the gradient-bar and fill-bar backgrounds from the active theme,
 * supporting both solid and gradient theme colors.
 */
export const useRevealBarStyles = (): RevealBarStyles => {
  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const themeYear = useGeneralStore(
    (s) => s.customTheme?.baseThemeYear ?? s.themeYear,
  );

  return useMemo(() => {
    const lookup = buildBackgroundColorLookup(overrides, themeYear);
    const tvFinishedRaw = lookup?.['countryItem.televoteFinishedBg'];
    const tvUnfinishedRaw = lookup?.['countryItem.televoteUnfinishedPointsBg'];
    const isGradient = (v?: string | null) => !!v && /gradient\(/i.test(v);

    let gradientBarBg: string;

    if (isGradient(tvFinishedRaw)) {
      const solid = extractSolidColorFromColorValue(tvFinishedRaw);

      gradientBarBg = solid
        ? `linear-gradient(to top, ${toTranslucent(
            solid,
            FADE_ALPHA,
          )}, ${solid})`
        : `linear-gradient(to top, hsl(var(--twc-countryItem-televoteFinishedBg) / 0.3), hsl(var(--twc-countryItem-televoteFinishedBg)))`;
    } else {
      gradientBarBg = `linear-gradient(to top, hsl(var(--twc-countryItem-televoteFinishedBg) / 0.3), hsl(var(--twc-countryItem-televoteFinishedBg)))`;
    }

    const fillBarBg = isGradient(tvUnfinishedRaw)
      ? tvUnfinishedRaw!
      : `hsl(var(--twc-countryItem-televoteUnfinishedPointsBg) / 0.8)`;

    return { gradientBarBg, fillBarBg };
  }, [overrides, themeYear]);
};
