import { CustomTheme } from '@/types/customTheme';
import { ThemeColors } from './types';
import { getThemeForYear, getThemeBackground } from './themes';
import { toFixedIfDecimal } from '@/helpers/toFixedIfDecimal';

// Constants for primary/gray shade generation
const PRIMARY_SL = {
  700: [86, 59],
  750: [62, 46],
  800: [61, 36],
  900: [64, 26],
  950: [67, 19],
} as const;

const GRAY_SL = {
  500: [26, 60],
  600: [21, 42],
  900: [31, 26],
} as const;

/**
 * Build primary colors from hue with fixed saturation/lightness
 */
export function buildPrimaryFromHue(hue: number): Record<string, string> {
  return Object.fromEntries(
    Object.entries(PRIMARY_SL).map(([key, [s, l]]) => [
      key,
      `${toFixedIfDecimal(hue)} ${s}% ${l}%`,
    ]),
  );
}

/**
 * Build gray colors from hue with fixed saturation/lightness
 */
export function buildGrayFromHue(hue: number): Record<string, string> {
  return Object.fromEntries(
    Object.entries(GRAY_SL).map(([key, [s, l]]) => [
      key,
      `${toFixedIfDecimal(hue)} ${s}% ${l}%`,
    ]),
  );
}

/**
 * Parse color overrides from storage format to usable colors
 */
function parseOverrides(
  overrides: Record<string, string>,
): Partial<ThemeColors> {
  const parsed: any = {};

  for (const [path, value] of Object.entries(overrides)) {
    const keys = path.split('.');
    let current = parsed;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  return parsed;
}

/**
 * Convert ThemeColors to CSS variable map
 */
export function toCssVarMap(colors: ThemeColors): Record<string, string> {
  const vars: Record<string, string> = {};

  const set = (key: string, cssValue: string) => {
    // Handle different formats and normalize to "h s% l%"
    let triplet = cssValue;

    // Skip gradients for CSS variables that are consumed via hsl(var(...))
    if (/gradient\(/i.test(cssValue)) {
      return; // do not set var; components can render gradients inline
    }

    // If it's in hsl(...) format, extract the content and remove commas
    const hslMatch = cssValue.match(/hsl\(([^)]+)\)/i);
    if (hslMatch) {
      // Remove commas and normalize spacing
      triplet = hslMatch[1].replace(/,/g, '').replace(/\s+/g, ' ').trim();
    }

    // If it's already in "h s% l%" format, use as-is
    // Otherwise, assume it's already in the correct format
    vars[`--twc-${key}`] = triplet;
  };

  // primary, gray
  Object.entries(colors.primary).forEach(([k, value]) =>
    set(`primary-${k}`, value),
  );
  Object.entries(colors.gray).forEach(([k, value]) => set(`gray-${k}`, value));

  // simple single tokens
  set('appBgColor', colors.appBgColor);
  set('animatedBorder', colors.animatedBorder);

  // countryItem.*
  Object.entries(colors.countryItem).forEach(([k, value]) =>
    set(`countryItem-${k}`, value as string),
  );

  // panelInfo.*
  Object.entries(colors.panelInfo).forEach(([k, value]) =>
    set(`panelInfo-${k}`, value as string),
  );

  return vars;
}

/** Build CSS variables for a custom theme without injecting global styles. */
export function getCssVarsForCustomTheme(
  theme: CustomTheme,
): Record<string, string> {
  const base = getThemeForYear(theme.baseThemeYear).colors;
  const primary = buildPrimaryFromHue(theme.hue);
  const gray = buildGrayFromHue(theme.hue);

  const parsedOverrides = parseOverrides(theme.overrides || {});
  const merged: ThemeColors = {
    ...base,
    primary: { ...base.primary, ...primary },
    gray: { ...base.gray, ...gray },
    countryItem: {
      ...base.countryItem,
      ...(parsedOverrides.countryItem || {}),
    },
    panelInfo: { ...base.panelInfo, ...(parsedOverrides.panelInfo || {}) },
    appBgColor: primary[800],
    animatedBorder: 'hsl(0, 0%, 100%)',
  } as ThemeColors;

  return toCssVarMap(merged);
}

/**
 * Apply custom theme at runtime
 */
export function applyCustomTheme(theme: CustomTheme, preview = false): void {
  const base = getThemeForYear(theme.baseThemeYear).colors;
  const primary = buildPrimaryFromHue(theme.hue);
  const gray = buildGrayFromHue(theme.hue);

  // Merge base + derived + overrides
  const parsedOverrides = parseOverrides(theme.overrides || {});
  const merged: ThemeColors = {
    ...base,
    primary: { ...base.primary, ...primary },
    gray: { ...base.gray, ...gray },
    countryItem: {
      ...base.countryItem,
      ...(parsedOverrides.countryItem || {}),
    },
    panelInfo: { ...base.panelInfo, ...(parsedOverrides.panelInfo || {}) },
    appBgColor: primary[800], // Use primary.800 color
    animatedBorder: 'hsl(0, 0%, 100%)', // Always white
  };

  // Inject CSS variables
  const vars = toCssVarMap(merged);
  const styleId = preview ? 'custom-theme-preview-vars' : 'custom-theme-vars';
  const selector = preview
    ? '[data-theme="custom-preview"]'
    : '[data-theme="custom"]';

  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  const cssText = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  style.textContent = `${selector} {\n${cssText}\n}`;

  if (!preview) {
    // Set theme attribute
    document.documentElement.setAttribute('data-theme', 'custom');

    // Apply background image if present
    if (theme.backgroundImageUrl) {
      document.body.style.backgroundImage = `url(${theme.backgroundImageUrl})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      // Use background from base theme
      const baseBg = getThemeBackground(theme.baseThemeYear);
      document.body.style.backgroundImage = `url(${baseBg})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }
}

/**
 * Clear custom theme and revert to static theme
 */
export function clearCustomTheme(): void {
  // Remove custom theme style
  const style = document.getElementById('custom-theme-vars');
  if (style) {
    style.remove();
  }
  // Remove preview style if present
  const previewStyle = document.getElementById('custom-theme-preview-vars');
  if (previewStyle) {
    previewStyle.remove();
  }

  // Remove data-theme attribute if it's "custom"
  if (document.documentElement.getAttribute('data-theme') === 'custom') {
    document.documentElement.removeAttribute('data-theme');
  }

  // Clear background styles
  document.body.style.backgroundImage = '';
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundAttachment = '';
}

/**
 * Get default theme colors for a given base theme year and hue
 */
export function getDefaultThemeColors(
  baseThemeYear: string,
  hue: number,
): ThemeColors {
  const base = getThemeForYear(baseThemeYear).colors;
  const primary = buildPrimaryFromHue(hue);
  const gray = buildGrayFromHue(hue);

  return {
    ...base,
    primary: { ...base.primary, ...primary },
    gray: { ...base.gray, ...gray },
  };
}
