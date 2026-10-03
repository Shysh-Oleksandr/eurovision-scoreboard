/**
 * Dependency-free OKLCH helpers.
 *
 * The interface palette (`--p-*`, `--accent`, `--accent-2` in
 * `src/design-system/tokens.css`) is derived in CSS from a handful of bare
 * numbers (`--prim-hue`, `--prim-l`, `--prim-c`, `--accent-h/l/c`,
 * `--accent-2-h/l/c` and the two `--*-ink-dark` flags). This module extracts
 * them from a theme's primary ramp so the palette follows both built-in year
 * themes (emitted at build time from `tailwind.config.js`) and custom themes
 * (set at runtime in `themeUtils.ts`). Accent values themselves live in
 * `interfaceAccents.ts`, which the Palette Lab (`/dev/palette-lab`) generates.
 *
 * Keep this file free of DOM/React imports: it is also loaded by the Tailwind
 * config at build time.
 */
import {
  ACCENT_KEYFRAMES,
  BUILTIN_INTERFACE_ACCENTS,
} from './interfaceAccents';
import { getThemeForYear } from './themes';

export type Rgb = { r: number; g: number; b: number }; // 0–1 each

export const DEFAULT_PRIM_HUE = 300;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** `hsl(h, s%, l%)` / `h s% l%` / `#rgb` / `#rrggbb` → sRGB (0–1). */
export function parseCssColorToRgb(value: string): Rgb | null {
  const v = value.trim();

  const hex = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (hex) {
    let [, h] = hex;

    if (h.length === 3) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    }

    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
    };
  }

  const rgb = v.match(
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i,
  );

  if (rgb) {
    return {
      r: clamp01(parseFloat(rgb[1]) / 255),
      g: clamp01(parseFloat(rgb[2]) / 255),
      b: clamp01(parseFloat(rgb[3]) / 255),
    };
  }

  const hsl = v.match(
    /^(?:hsla?\(\s*)?(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%?\s*[, ]\s*([\d.]+)%?/i,
  );

  if (hsl) {
    return hslToRgb(
      parseFloat(hsl[1]),
      parseFloat(hsl[2]) / 100,
      parseFloat(hsl[3]) / 100,
    );
  }

  return null;
}

/** h in degrees, s and l in 0–1 → sRGB 0–1. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = clamp01(s);
  const lig = clamp01(l);

  if (sat === 0) return { r: lig, g: lig, b: lig };

  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  const channel = (t: number) => {
    let x = t;

    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;

    return p;
  };

  return {
    r: channel(hue + 1 / 3),
    g: channel(hue),
    b: channel(hue - 1 / 3),
  };
}

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

/** sRGB (0–1) → OKLab. */
export function srgbToOklab({ r, g, b }: Rgb): {
  L: number;
  a: number;
  b: number;
} {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export interface Oklch {
  /** Lightness, 0–100. */
  L: number;
  /** Chroma (0 ≈ gray, ~0.3 = fully vivid). */
  C: number;
  /** Hue in degrees [0, 360), or null when the colour is (near) achromatic. */
  H: number | null;
}

const ACHROMATIC_CHROMA = 0.005;
const round1 = (v: number) => Math.round(v * 10) / 10;
const normalizeHue = (deg: number) => ((deg % 360) + 360) % 360;

/** Full OKLCH of an sRGB colour. */
export function oklchFromRgb(rgb: Rgb): Oklch {
  const { L, a, b } = srgbToOklab(rgb);
  const chroma = Math.sqrt(a * a + b * b);
  const hue =
    chroma < ACHROMATIC_CHROMA
      ? null
      : round1(normalizeHue((Math.atan2(b, a) * 180) / Math.PI));

  return { L: round1(L * 100), C: Math.round(chroma * 1000) / 1000, H: hue };
}

/** OKLCH hue (0–360) of an sRGB colour, or null when it is (near) achromatic. */
export function oklchHueFromRgb(rgb: Rgb): number | null {
  return oklchFromRgb(rgb).H;
}

/** OKLCH hue of any supported CSS colour string; `fallback` when unparseable/achromatic. */
export function oklchHueFromCssColor(
  value: string,
  fallback: number = DEFAULT_PRIM_HUE,
): number {
  const rgb = parseCssColorToRgb(value);

  if (!rgb) return fallback;

  return oklchHueFromRgb(rgb) ?? fallback;
}

/** sRGB transfer: linear light (0–1) → gamma-encoded channel (0–1). */
const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const GAMUT_EPSILON = 0.0005;

/** Linear-light sRGB of an OKLCH colour (L 0–100); channels may fall outside 0–1. */
function oklchToLinearRgb(L: number, C: number, H: number): Rgb {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const lightness = L / 100;

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

const inGamut = ({ r, g, b }: Rgb) =>
  [r, g, b].every((c) => c >= -GAMUT_EPSILON && c <= 1 + GAMUT_EPSILON);

/** OKLCH (L 0–100) → gamma-encoded sRGB (0–1), clipped per channel. */
export function oklchToRgb(L: number, C: number, H: number): Rgb {
  const lin = oklchToLinearRgb(L, C, H);

  return {
    r: clamp01(linearToSrgb(clamp01(lin.r))),
    g: clamp01(linearToSrgb(clamp01(lin.g))),
    b: clamp01(linearToSrgb(clamp01(lin.b))),
  };
}

/** `#rrggbb` of an OKLCH colour (clipped to sRGB). */
export function oklchToHex(L: number, C: number, H: number): string {
  const { r, g, b } = oklchToRgb(L, C, H);
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Highest chroma that keeps OKLCH (L, ·, H) inside sRGB. */
export function maxChromaInGamut(L: number, H: number): number {
  let lo = 0;
  let hi = 0.4;

  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;

    if (inGamut(oklchToLinearRgb(L, mid, H))) lo = mid;
    else hi = mid;
  }

  return lo;
}

/** WCAG relative luminance (0–1) of an OKLCH colour, gamut-clipped. */
export function oklchLuminance(L: number, C: number, H: number): number {
  const lin = oklchToLinearRgb(L, C, H);

  return (
    0.2126 * clamp01(lin.r) + 0.7152 * clamp01(lin.g) + 0.0722 * clamp01(lin.b)
  );
}

/** WCAG contrast ratio between two relative luminances (1–21). */
export function contrastRatio(y1: number, y2: number): number {
  const hi = Math.max(y1, y2);
  const lo = Math.min(y1, y2);

  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ */
/* Interface tokens: the numbers tokens.css turns into the palette      */
/* ------------------------------------------------------------------ */

/** Lightness / chroma used when a theme colour cannot be parsed (hue 300 look). */
export const DEFAULT_PRIM_LIGHTNESS = 26;
export const DEFAULT_PRIM_CHROMA = 0.07;

/** An OKLCH colour as bare numbers: hue (deg), lightness (0–100), chroma. */
export interface AccentSpec {
  h: number;
  l: number;
  c: number;
}

/** Hand-picked accents for one theme; `accent2` falls back to the auto curve. */
export interface InterfaceAccents {
  accent: AccentSpec;
  accent2?: AccentSpec;
}

/**
 * One point of the auto-accent curve: the accents for a primary of this hue
 * (the row's `hue`) generated at custom-theme shade `shade`, whose
 * `primary.900` lightness is `primL`.
 */
export interface AccentKeyframeStop {
  shade: number;
  primL: number;
  accent: AccentSpec;
  accent2?: AccentSpec;
}

export interface AccentKeyframeRow {
  /** OKLCH hue of `primary.800` this row was tuned for. */
  hue: number;
  /** Sorted by `primL` (dark → light). */
  stops: AccentKeyframeStop[];
}

export interface InterfaceTokens {
  /** OKLCH hue of `primary.800`: the tint of every modal surface (`--prim-hue`). */
  hue: number;
  /** OKLCH lightness (0–100) of `primary.900`: how light the surfaces are (`--prim-l`). */
  lightness: number;
  /** OKLCH chroma of `primary.900`: how saturated the surfaces are (`--prim-c`). */
  chroma: number;
  /** Accent (CTA, selection, Themes tone), gamut-clamped. */
  accent: AccentSpec;
  /** Secondary accent (Profile tone, stage tint), gamut-clamped. */
  accent2: AccentSpec;
  /** Text on an accent fill is dark (true) or white (false); see `pickAccentInk`. */
  accentInkDark: boolean;
  accent2InkDark: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Signed shortest angular distance a → b, in (−180, 180]. */
export function hueDelta(a: number, b: number): number {
  const d = normalizeHue(b - a);

  return d > 180 ? d - 360 : d;
}

/** Interpolate two accents; hue travels the shorter way round the wheel. */
export function mixAccent(
  from: AccentSpec,
  to: AccentSpec,
  t: number,
): AccentSpec {
  return {
    h: normalizeHue(from.h + hueDelta(from.h, to.h) * t),
    l: lerp(from.l, to.l, t),
    c: lerp(from.c, to.c, t),
  };
}

/** Pull an accent's chroma back inside sRGB so what renders is what was measured. */
export function clampAccentToGamut(spec: AccentSpec): AccentSpec {
  const h = normalizeHue(spec.h);

  return {
    h: round1(h),
    l: round1(spec.l),
    c: round3(Math.max(0, Math.min(spec.c, maxChromaInGamut(spec.l, h)))),
  };
}

/** The original secondary accent: 40° behind the primary at fixed L/C. */
export function defaultAccent2(primHue: number): AccentSpec {
  return { h: normalizeHue(primHue - 40), l: 62, c: 0.19 };
}

/**
 * The two stops of the Start CTA gradient (`.dp-cta` in styles.css — keep in
 * sync): the accent itself at 85% chroma on top, 16 L% darker at the bottom.
 */
export function getCtaStops(accent: AccentSpec): [AccentSpec, AccentSpec] {
  return [
    { h: accent.h, l: accent.l, c: accent.c * 0.85 },
    { h: accent.h, l: accent.l - 16, c: accent.c * 0.85 * 0.9 },
  ];
}

/** Dark ink for light accents: deep, slightly on-hue (`--accent-ink` in tokens.css). */
export const DARK_INK_L = 22;
export const DARK_INK_C = 0.05;

/** White text needs 3:1 (WCAG AA for large bold text, which the CTA is). */
export const MIN_INK_CONTRAST = 3;

/**
 * Text colour for an accent fill. White is preferred while it reaches 3:1 on
 * the lightest CTA stop; past that (gold, lime, mint, cream accents) a dark
 * on-hue ink takes over when it reads better on the darkest stop. Returns the
 * worst-case contrast of the chosen ink across the gradient.
 */
export function pickAccentInk(accent: AccentSpec): {
  dark: boolean;
  contrast: number;
} {
  const [top, bottom] = getCtaStops(accent).map(clampAccentToGamut);
  const yTop = oklchLuminance(top.l, top.c, top.h);
  const yBottom = oklchLuminance(bottom.l, bottom.c, bottom.h);
  const ink = clampAccentToGamut({ h: accent.h, l: DARK_INK_L, c: DARK_INK_C });
  const yInk = oklchLuminance(ink.l, ink.c, ink.h);

  const white = contrastRatio(1, yTop);
  const dark = contrastRatio(yInk, yBottom);

  if (white >= MIN_INK_CONTRAST || white >= dark) {
    return { dark: false, contrast: round2(white) };
  }

  return { dark: true, contrast: round2(dark) };
}

function sampleKeyframeRow(
  row: AccentKeyframeRow,
  primL: number,
): { accent: AccentSpec; accent2: AccentSpec } {
  const resolve = (stop: AccentKeyframeStop) => ({
    accent: stop.accent,
    accent2: stop.accent2 ?? defaultAccent2(row.hue),
  });
  const { stops } = row;

  if (primL <= stops[0].primL) return resolve(stops[0]);

  for (let i = 1; i < stops.length; i += 1) {
    if (primL <= stops[i].primL) {
      const lo = resolve(stops[i - 1]);
      const hi = resolve(stops[i]);
      const t =
        (primL - stops[i - 1].primL) / (stops[i].primL - stops[i - 1].primL);

      return {
        accent: mixAccent(lo.accent, hi.accent, t),
        accent2: mixAccent(lo.accent2, hi.accent2, t),
      };
    }
  }

  return resolve(stops[stops.length - 1]);
}

/**
 * Accents for any primary, read off the keyframe curve (`ACCENT_KEYFRAMES`,
 * tuned in the Palette Lab): interpolated between the two nearest hue rows,
 * and inside each row between the shades around the primary's lightness.
 * Continuous in both directions, so dragging a custom theme's hue or shade
 * never makes the accent jump.
 */
export function getAutoAccents(
  primHue: number,
  primL: number,
  keyframes: AccentKeyframeRow[] = ACCENT_KEYFRAMES,
): { accent: AccentSpec; accent2: AccentSpec } {
  const rows = keyframes.filter((row) => row.stops.length > 0);
  const h = normalizeHue(primHue);

  if (rows.length === 0) {
    return {
      accent: { h: normalizeHue(h + 55), l: 66, c: 0.24 },
      accent2: defaultAccent2(h),
    };
  }

  if (rows.length === 1) return sampleKeyframeRow(rows[0], primL);

  // The last row whose hue is at or before `h`, wrapping round the wheel.
  let index = rows.length - 1;

  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].hue <= h) index = i;
  }

  const from = rows[index];
  const to = rows[(index + 1) % rows.length];
  const span = normalizeHue(to.hue - from.hue) || 360;
  const t = normalizeHue(h - from.hue) / span;
  const a = sampleKeyframeRow(from, primL);
  const b = sampleKeyframeRow(to, primL);

  return {
    accent: mixAccent(a.accent, b.accent, t),
    accent2: mixAccent(a.accent2, b.accent2, t),
  };
}

/**
 * Interface tokens from a theme's primary ramp. `primary.800` is the app's
 * documented "theme primary" (see `resolveThemeBaseHue`) and gives the hue;
 * `primary.900` (the old modal background) gives lightness and chroma, so a
 * light or a gray theme produces a lighter or a grayer modal. Accents come
 * from `accents` when a theme has hand-picked ones, else from the auto curve
 * (`keyframes`, defaulting to `ACCENT_KEYFRAMES`).
 */
export function getInterfaceTokens(
  primary: { 800: string; 900: string },
  accents?: Partial<InterfaceAccents>,
  keyframes?: AccentKeyframeRow[],
): InterfaceTokens {
  const rgb800 = parseCssColorToRgb(primary[800]);
  const rgb900 = parseCssColorToRgb(primary[900]);
  const lch800 = rgb800 ? oklchFromRgb(rgb800) : null;
  const lch900 = rgb900 ? oklchFromRgb(rgb900) : null;

  const hue = lch800?.H ?? lch900?.H ?? DEFAULT_PRIM_HUE;
  const lightness = lch900?.L ?? DEFAULT_PRIM_LIGHTNESS;
  const auto = getAutoAccents(hue, lightness, keyframes);
  const accent = clampAccentToGamut(accents?.accent ?? auto.accent);
  const accent2 = clampAccentToGamut(accents?.accent2 ?? auto.accent2);

  return {
    hue,
    lightness,
    chroma: lch900?.C ?? DEFAULT_PRIM_CHROMA,
    accent,
    accent2,
    accentInkDark: pickAccentInk(accent).dark,
    accent2InkDark: pickAccentInk(accent2).dark,
  };
}

/** The CSS custom properties tokens.css derives the palette from (bare numbers). */
export const INTERFACE_TOKEN_VARS = [
  '--prim-hue',
  '--prim-l',
  '--prim-c',
  '--accent-h',
  '--accent-l',
  '--accent-c',
  '--accent-ink-dark',
  '--accent-2-h',
  '--accent-2-l',
  '--accent-2-c',
  '--accent-2-ink-dark',
] as const;

export type InterfaceTokenVar = (typeof INTERFACE_TOKEN_VARS)[number];

export function interfaceTokensToCssVars(
  tokens: InterfaceTokens,
): Record<InterfaceTokenVar, string> {
  return {
    '--prim-hue': String(tokens.hue),
    '--prim-l': String(tokens.lightness),
    '--prim-c': String(tokens.chroma),
    '--accent-h': String(tokens.accent.h),
    '--accent-l': String(tokens.accent.l),
    '--accent-c': String(tokens.accent.c),
    '--accent-ink-dark': tokens.accentInkDark ? '1' : '0',
    '--accent-2-h': String(tokens.accent2.h),
    '--accent-2-l': String(tokens.accent2.l),
    '--accent-2-c': String(tokens.accent2.c),
    '--accent-2-ink-dark': tokens.accent2InkDark ? '1' : '0',
  };
}

/** Interface tokens for a built-in year theme, with its hand-picked accents. */
export function getThemeInterfaceTokens(themeYear: string): InterfaceTokens {
  return getInterfaceTokens(
    getThemeForYear(themeYear).colors.primary,
    BUILTIN_INTERFACE_ACCENTS[themeYear],
  );
}

/** Interface CSS variables for a built-in year theme (emitted at build time). */
export function getThemeInterfaceVars(
  themeYear: string,
): Record<InterfaceTokenVar, string> {
  return interfaceTokensToCssVars(getThemeInterfaceTokens(themeYear));
}

/** `--prim-hue` for a built-in year theme. */
export function getThemePrimHue(themeYear: string): number {
  return getThemeInterfaceTokens(themeYear).hue;
}
