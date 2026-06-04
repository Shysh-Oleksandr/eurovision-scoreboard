import type { CSSProperties } from 'react';

import { getThemeForYear } from '@/theme/themes';
import { CustomTheme } from '@/types/customTheme';

/** CSS custom property for theme-derived outer glow hue (degrees, unitless). */
export const QUALIFIED_PANEL_GLOW_HUE_VAR = '--qualified-panel-glow-hue';

const PANEL_GLOW_HUE_OFFSET_WARM = 170;
const PANEL_GLOW_HUE_OFFSET_COOL = 60;
const WARM_HUE_MAX = 70;
const WARM_HUE_MIN_WRAP = 300;
const DEFAULT_GLOW_HUE = 210;

export function parseHueFromHsl(value: string): number {
  const hslMatch = value.trim().match(/^hsl\(\s*([\d.]+)/i);

  if (hslMatch) {
    return normalizeHue(Number(hslMatch[1]));
  }

  const tripletMatch = value.trim().match(/^([\d.]+)\s/);

  if (tripletMatch) {
    return normalizeHue(Number(tripletMatch[1]));
  }

  return DEFAULT_GLOW_HUE;
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export function resolveThemeBaseHue(
  themeYear: string,
  customTheme: CustomTheme | null,
): number {
  if (customTheme) {
    return normalizeHue(customTheme.hue);
  }

  return parseHueFromHsl(getThemeForYear(themeYear).colors.primary[800]);
}

export function getPanelGlowHue(baseHue: number): number {
  const isWarm = baseHue < WARM_HUE_MAX || baseHue > WARM_HUE_MIN_WRAP;
  const offset = isWarm
    ? PANEL_GLOW_HUE_OFFSET_WARM
    : PANEL_GLOW_HUE_OFFSET_COOL;

  return normalizeHue(baseHue + offset);
}

export function getQualifiedPanelGlowHue(
  themeYear: string,
  customTheme: CustomTheme | null,
): number {
  return getPanelGlowHue(resolveThemeBaseHue(themeYear, customTheme));
}

export function getQualifiedPanelGlowStyle(
  themeYear: string,
  customTheme: CustomTheme | null,
): CSSProperties {
  return {
    [QUALIFIED_PANEL_GLOW_HUE_VAR]: getQualifiedPanelGlowHue(
      themeYear,
      customTheme,
    ),
  } as CSSProperties;
}
