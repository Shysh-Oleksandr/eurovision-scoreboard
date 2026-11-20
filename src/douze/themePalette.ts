import type { DouzeThemeColorKey } from './model';

/**
 * A theme's own colours for a douze animation (`paletteFrom: 'theme'`, the
 * "Theme colors" option), in the spec's `themeColors` order. By default its
 * 12 box, its douze colour and its row text, so the 2022 sweeps take the
 * box's colour and the ring the text's; the 2026 gold takes the douze
 * colour. Read from the row's CSS variables, so a custom theme's overrides
 * and the theme editor's preview count.
 */

export const DEFAULT_THEME_COLORS: DouzeThemeColorKey[] = [
  'juryLastPointsBg',
  'douzePointsBg',
  'juryCountryText',
];

const toHex2 = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');

const hslToHex = (h: number, s: number, l: number) => {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;

    return 255 * (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };

  return `#${toHex2(channel(0))}${toHex2(channel(8))}${toHex2(channel(4))}`;
};

/**
 * A theme colour variable's value as `#rrggbb`: the "h s% l%" triplets the
 * theme pipeline writes (tw-colors and `toCssVarMap`), `hsl(…)` or a hex.
 * Null for anything else (an empty variable: a gradient has none).
 */
export const themeColorToHex = (raw: string): string | null => {
  const value = raw.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(value);

  if (hex) return `#${hex[1].toLowerCase()}`;

  const hsl =
    /^(?:hsla?\()?\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(
      value,
    );

  if (!hsl) return null;

  const [h, s, l] = hsl.slice(1).map(Number);

  return hslToHex(((h % 360) + 360) % 360, s, l);
};

/** The theme's colours on `el`'s row, or null when none can be read. */
export const readThemeColors = (
  el: Element,
  keys: DouzeThemeColorKey[] = DEFAULT_THEME_COLORS,
): string[] | null => {
  const style = getComputedStyle(el);
  const colors = keys.map((key) =>
    themeColorToHex(style.getPropertyValue(`--twc-countryItem-${key}`)),
  );
  const [first] = colors.filter((color): color is string => color !== null);

  // One missing (a gradient sets no variable) takes the first's place, so
  // the others keep theirs.
  return first ? colors.map((color) => color ?? first) : null;
};
