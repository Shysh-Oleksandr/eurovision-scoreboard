import type { CSSProperties } from 'react';

import { hslStringToHex, parseColor } from '@/helpers/colorConversion';
import { getThemeForYear } from '@/theme/themes';

export const ROUNDED_SUBTLE_GLOW =
  'drop-shadow(rgb(248 225 196 / 40%) 1px 0px 7px)';
export const ROUNDED_SUBTLE_GLOW_HOVER =
  'drop-shadow(rgb(248 225 196 / 65%) 1px 0px 14px)';
export const ROUNDED_GLOW_TRANSITION =
  'filter 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
const ROUNDED_GLOW_HOVER_BOOST = 1.4;

/**
 * The glow is deliberately **desktop-only (`md` and up)**, and is never set as
 * an inline `filter`: callers publish it as the `--country-item-glow` variable
 * (see `roundedGlowStyle`) and this class turns it into a `filter` inside the
 * `md` breakpoint, so phones render no glow at all.
 *
 * Why: iOS Safari clips an element's own `drop-shadow` by that same element's
 * `overflow: hidden` + `border-radius`, so the glow appeared sliced off around
 * the points pills. It looked right only while a FLIP/teleport animation ran,
 * because the moving row is composited then and Safari paints it another way —
 * exactly the "fixes itself mid-animation, breaks again after" symptom. Moving
 * the filter onto a non-clipping wrapper element does not help; only skipping
 * it at phone widths does.
 *
 * The var has no fallback on purpose: when unset, `filter` is invalid at
 * computed-value time and resolves to its initial `none`.
 */
export const ROUNDED_GLOW_CLASS = 'md:[filter:var(--country-item-glow)]';
export const ROUNDED_GLOW_VAR = '--country-item-glow';

/** Publishes `glow` for {@link ROUNDED_GLOW_CLASS} to apply (md and up). */
export function roundedGlowStyle(
  glow: string,
  transition?: string,
): CSSProperties {
  return { [ROUNDED_GLOW_VAR]: glow, transition } as CSSProperties;
}

/** Split button surface classes for rounded pill layout (opacity on container, bg on name strip). */
export function splitRoundedCountryItemSurfaceClasses(classNames: string): {
  containerOpacity: string;
  nameStripSurface: string;
} {
  const tokens = classNames.split(/\s+/).filter(Boolean);

  return {
    containerOpacity: tokens
      .filter((c) => c.startsWith('opacity-') || c.startsWith('!opacity-'))
      .join(' '),
    nameStripSurface: tokens.filter((c) => c.startsWith('bg-')).join(' '),
  };
}

export function resolveTelevoteOutlineColor(
  themeYear: string,
  overrides: Record<string, string> | null | undefined,
): string {
  const override = overrides?.['countryItem.televoteOutline'];

  if (override) {
    if (/^(hsl|rgb|#)/i.test(override.trim())) {
      return override;
    }

    return `hsl(${override})`;
  }

  return getThemeForYear(themeYear).colors.countryItem.televoteOutline;
}

/** Comma-containing `hsl(h, s%, l%)` breaks `drop-shadow()` — normalize to #hex. */
export function toFilterSafeColor(color: string): string {
  const trimmed = color.trim();

  if (!trimmed) {
    return '#888888';
  }

  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return trimmed;
  }

  const triplet = parseColor(trimmed);
  const converted = hslStringToHex(triplet || trimmed);

  if (converted.startsWith('#')) {
    return converted;
  }

  const rgbMatch = converted.match(
    /rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i,
  );

  if (rgbMatch) {
    const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');

    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  return '#888888';
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace(/^#/, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.slice(0, 6);

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

/** Multi-layer televote halo (matches original strength); rgb() space syntax avoids hsl comma parse bugs. */
export function buildActiveTelevoteDropShadowFilter(
  color: string,
  hovered = false,
): string {
  const { r, g, b } = parseHexRgb(toFilterSafeColor(color));
  const boost = hovered ? ROUNDED_GLOW_HOVER_BOOST : 1;
  const alpha = (pct: number) => Math.min(1, pct * boost).toFixed(2);
  const layer = (blur: number, opacity: number) =>
    `drop-shadow(0 0 ${blur}px rgb(${r} ${g} ${b} / ${alpha(opacity)}))`;

  return [layer(4, 1), layer(2, 1), layer(10, 0.8), layer(18, 0.55)].join(' ');
}

export function getRoundedSubtleGlowStyle(hovered: boolean): CSSProperties {
  return roundedGlowStyle(
    hovered ? ROUNDED_SUBTLE_GLOW_HOVER : ROUNDED_SUBTLE_GLOW,
    ROUNDED_GLOW_TRANSITION,
  );
}
