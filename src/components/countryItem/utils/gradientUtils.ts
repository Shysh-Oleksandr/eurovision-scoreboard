import { hslStringToHex } from '@/helpers/colorConversion';
import React from 'react';

/**
 * Map button background classes to override keys that may support gradients.
 */
const BG_CLASS_TO_OVERRIDE_KEY: Record<string, string> = {
  'bg-countryItem-juryBg': 'countryItem.juryBg',
  'bg-countryItem-televoteUnfinishedBg': 'countryItem.televoteUnfinishedBg',
  'bg-countryItem-televoteActiveBg': 'countryItem.televoteActiveBg',
  'bg-countryItem-televoteFinishedBg': 'countryItem.televoteFinishedBg',
  'bg-countryItem-unqualifiedBg': 'countryItem.unqualifiedBg',
  'bg-countryItem-douzePointsBg': 'countryItem.douzePointsBg',
  'bg-countryItem-juryPlaceContainerBg': 'countryItem.juryPlaceContainerBg',
  'bg-countryItem-televoteUnfinishedPlaceContainerBg': 'countryItem.televoteUnfinishedPlaceContainerBg',
  'bg-countryItem-televoteActivePlaceContainerBg': 'countryItem.televoteActivePlaceContainerBg',
  'bg-countryItem-televoteFinishedPlaceContainerBg': 'countryItem.televoteFinishedPlaceContainerBg',
  'bg-countryItem-unqualifiedPlaceContainerBg': 'countryItem.unqualifiedPlaceContainerBg',
  'bg-panelInfo-activeBg': 'panelInfo.activeBg',
  'bg-panelInfo-inactiveBg': 'panelInfo.inactiveBg',
};

/**
 * Given a className that contains bg-countryItem-* classes and the current overrides,
 * returns an inline style if the corresponding override contains a special color format
 * (gradient, rgba, or HSL with alpha) that can't be handled by CSS variables.
 */
export function getSpecialBackgroundStyle(
  className: string,
  overrides?: Record<string, string> | null,
): React.CSSProperties | undefined {
  if (!className || !overrides) return undefined;

  const classes = className.split(/\s+/).filter(Boolean);

  for (const cls of classes) {
    const key = BG_CLASS_TO_OVERRIDE_KEY[cls];
    if (!key) continue;

    const value = overrides[key];
    if (typeof value === 'string') {
      // Check for special color formats that need inline styles
      if (
        /gradient\(/i.test(value) ||
        /rgba?\(/.test(value) ||
        /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?$/.test(value.trim())
      ) {
        return { background: hslStringToHex(value) } as React.CSSProperties;
      }
    }
  }

  return undefined;
}

/**
 * Extract a solid color from a color value.
 * - Solid colors are returned as-is (normalized when possible).
 * - Gradients return the first explicit color stop.
 */
export function extractSolidColorFromColorValue(
  colorValue?: string | null,
): string | undefined {
  if (!colorValue || typeof colorValue !== 'string') return undefined;

  const value = colorValue.trim();
  if (!value) return undefined;

  const firstExplicitColorMatch = value.match(
    /#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]*\)|hsla?\([^)]*\)/i,
  );

  if (firstExplicitColorMatch) {
    return hslStringToHex(toOpaqueColorValue(firstExplicitColorMatch[0]));
  }

  if (/gradient\(/i.test(value)) {
    return undefined;
  }

  return hslStringToHex(toOpaqueColorValue(value));
}

const toOpaqueColorValue = (rawValue: string): string => {
  const value = rawValue.trim();

  const rgbaMatch = value.match(
    /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/i,
  );
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgb(${r}, ${g}, ${b})`;
  }

  const hslaMatch = value.match(
    /^hsla\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*[\d.]+\s*\)$/i,
  );
  if (hslaMatch) {
    const [, h, s, l] = hslaMatch;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  const hslAlphaTupleMatch = value.match(
    /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s+\d+(?:\.\d+)?$/,
  );
  if (hslAlphaTupleMatch) {
    const [, h, s, l] = hslAlphaTupleMatch;
    return `${h} ${s}% ${l}%`;
  }

  return value;
};
