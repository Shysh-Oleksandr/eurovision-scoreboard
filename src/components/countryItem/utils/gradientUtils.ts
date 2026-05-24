import { hslStringToHex } from '@/helpers/colorConversion';
import { getThemeForYear } from '@/theme/themes';
import { ThemeColors } from '@/theme/types';
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
  'bg-countryItem-televoteUnfinishedPlaceContainerBg':
    'countryItem.televoteUnfinishedPlaceContainerBg',
  'bg-countryItem-televoteActivePlaceContainerBg':
    'countryItem.televoteActivePlaceContainerBg',
  'bg-countryItem-televoteFinishedPlaceContainerBg':
    'countryItem.televoteFinishedPlaceContainerBg',
  'bg-countryItem-unqualifiedPlaceContainerBg':
    'countryItem.unqualifiedPlaceContainerBg',
  'bg-panelInfo-activeBg': 'panelInfo.activeBg',
  'bg-panelInfo-inactiveBg': 'panelInfo.inactiveBg',
};

function flattenThemeBackgroundColors(
  colors: ThemeColors,
): Record<string, string> {
  const lookup: Record<string, string> = {};

  Object.entries(colors.countryItem).forEach(([key, value]) => {
    lookup[`countryItem.${key}`] = value;
  });
  Object.entries(colors.panelInfo).forEach(([key, value]) => {
    lookup[`panelInfo.${key}`] = value;
  });

  return lookup;
}

function isSpecialBackgroundValue(value: string): boolean {
  return (
    /gradient\(/i.test(value) ||
    /rgba?\(/.test(value) ||
    /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?$/.test(
      value.trim(),
    )
  );
}

function toSpecialBackgroundStyle(value: string): React.CSSProperties {
  if (/gradient\(/i.test(value)) {
    return { background: value };
  }

  return { background: hslStringToHex(value) };
}

/**
 * Merge default theme colors with custom overrides (overrides win).
 * Used for gradients/rgba/HSL-alpha values that tw-colors cannot express as CSS variables.
 */
export function buildBackgroundColorLookup(
  overrides?: Record<string, string> | null,
  themeYear?: string | null,
): Record<string, string> | null {
  let lookup: Record<string, string> = {};

  if (themeYear) {
    lookup = flattenThemeBackgroundColors(getThemeForYear(themeYear).colors);
  }

  if (overrides) {
    lookup = { ...lookup, ...overrides };
  }

  return Object.keys(lookup).length > 0 ? lookup : null;
}

/**
 * Given a className that contains bg-countryItem-* / bg-panelInfo-* classes,
 * returns an inline style when the color is a gradient, rgba, or HSL with alpha.
 * Resolves from custom overrides and/or the active default theme year.
 */
export function getSpecialBackgroundStyle(
  className: string,
  overrides?: Record<string, string> | null,
  themeYear?: string | null,
): React.CSSProperties | undefined {
  const lookup = buildBackgroundColorLookup(overrides, themeYear);

  if (!className || !lookup) return undefined;

  const classes = className.split(/\s+/).filter(Boolean);

  for (const cls of classes) {
    const key = BG_CLASS_TO_OVERRIDE_KEY[cls];
    if (!key) continue;

    const value = lookup[key];
    if (typeof value === 'string' && isSpecialBackgroundValue(value)) {
      return toSpecialBackgroundStyle(value);
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
