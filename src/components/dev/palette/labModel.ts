/**
 * Palette Lab model (dev only): the custom-theme samples the auto-accent
 * curve is tuned on, candidate accents per row, and the picks the lab and the
 * in-app palette panel share through localStorage.
 */
import {
  ACCENT_KEYFRAMES,
  BUILTIN_INTERFACE_ACCENTS,
} from '@/theme/interfaceAccents';
import {
  AccentKeyframeRow,
  AccentSpec,
  clampAccentToGamut,
  contrastRatio,
  defaultAccent2,
  getAutoAccents,
  getInterfaceTokens,
  hueDelta,
  InterfaceAccents,
  InterfaceTokens,
  mixAccent,
  oklchFromRgb,
  oklchLuminance,
  parseCssColorToRgb,
} from '@/theme/oklch';
import { getThemeForYear, YEARS_WITH_THEME } from '@/theme/themes';
import { buildPrimaryFromHsva } from '@/theme/themeUtils';

export type AccentTarget = 'accent' | 'accent2';
export type PickSet = Partial<Record<AccentTarget, AccentSpec>>;

export interface LabPicks {
  builtin: Record<string, PickSet>;
  keyframes: Record<string, PickSet>;
}

export const EMPTY_PICKS: LabPicks = { builtin: {}, keyframes: {} };

/** OKLCH hues of `primary.800` the auto curve is tuned at. */
export const KEYFRAME_HUES = Array.from({ length: 12 }, (_, i) => i * 30);

/** Custom-theme shade values (the editor's brightness) each hue row is tuned at. */
export const KEYFRAME_SHADES = [
  { shade: 35, label: 'Dark' },
  { shade: 60, label: 'Default' },
  { shade: 85, label: 'Light' },
] as const;

export const keyframeKey = (hue: number, shade: number) => `${hue}@${shade}`;

/* ------------------------------------------------------------------ */
/* Picks storage (shared by /dev/palette-lab and the in-app panel)      */
/* ------------------------------------------------------------------ */

export const LAB_STORAGE_KEY = 'dp-palette-lab:v1';

export function loadPicks(): LabPicks {
  try {
    const raw = localStorage.getItem(LAB_STORAGE_KEY);

    if (!raw) return EMPTY_PICKS;

    const parsed = JSON.parse(raw) as Partial<LabPicks>;

    return {
      builtin: parsed.builtin ?? {},
      keyframes: parsed.keyframes ?? {},
    };
  } catch {
    return EMPTY_PICKS;
  }
}

export function savePicks(picks: LabPicks): void {
  try {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(picks));
  } catch {
    // Storage blocked: picks stay in memory for this tab.
  }
}

export const countPicks = (picks: LabPicks) =>
  [...Object.values(picks.builtin), ...Object.values(picks.keyframes)].reduce(
    (sum, set) => sum + Object.keys(set).length,
    0,
  );

/* ------------------------------------------------------------------ */
/* Custom-theme samples                                                 */
/* ------------------------------------------------------------------ */

export interface CustomSample {
  /** The editor's (HSL) hue that lands `primary.800` on the wanted OKLCH hue. */
  hslHue: number;
  shade: number;
  primary: { 800: string; 900: string };
  /** OKLCH hue of `primary.800` / lightness of `primary.900`. */
  primHue: number;
  primL: number;
}

export function customPrimary(hslHue: number, shade: number) {
  const ramp = buildPrimaryFromHsva({ h: hslHue, s: 80, v: shade });

  return { 800: ramp['800'], 900: ramp['900'] };
}

const lchOf = (color: string) => {
  const rgb = parseCssColorToRgb(color);

  return rgb ? oklchFromRgb(rgb) : null;
};

export function sampleFromHslHue(hslHue: number, shade: number): CustomSample {
  const primary = customPrimary(hslHue, shade);

  return {
    hslHue,
    shade,
    primary,
    primHue: lchOf(primary[800])?.H ?? 0,
    primL: lchOf(primary[900])?.L ?? 0,
  };
}

const sampleCache = new Map<string, CustomSample>();

/** The custom theme (editor hue at `shade`) whose primary sits at OKLCH `oklchHue`. */
export function getCustomSample(oklchHue: number, shade: number): CustomSample {
  const key = keyframeKey(oklchHue, shade);
  const cached = sampleCache.get(key);

  if (cached) return cached;

  let best = sampleFromHslHue(0, shade);

  for (let x = 0.5; x < 360; x += 0.5) {
    const candidate = sampleFromHslHue(x, shade);

    if (
      Math.abs(hueDelta(candidate.primHue, oklchHue)) <
      Math.abs(hueDelta(best.primHue, oklchHue))
    ) {
      best = candidate;
    }
  }

  sampleCache.set(key, best);

  return best;
}

/* ------------------------------------------------------------------ */
/* Code values merged with picks                                        */
/* ------------------------------------------------------------------ */

function codeStop(hue: number, shade: number) {
  return ACCENT_KEYFRAMES.find((row) => row.hue === hue)?.stops.find(
    (stop) => stop.shade === shade,
  );
}

/** The keyframe table the lab edits: code values, then the lab's picks on top. */
export function mergedKeyframes(picks: LabPicks): AccentKeyframeRow[] {
  return KEYFRAME_HUES.map((hue) => ({
    hue,
    stops: KEYFRAME_SHADES.map(({ shade }) => {
      const sample = getCustomSample(hue, shade);
      const code = codeStop(hue, shade);
      const pick = picks.keyframes[keyframeKey(hue, shade)] ?? {};
      const fallback = getAutoAccents(hue, sample.primL);
      const accent2 = pick.accent2 ?? code?.accent2;

      return {
        shade,
        primL: sample.primL,
        accent: pick.accent ?? code?.accent ?? fallback.accent,
        ...(accent2 ? { accent2 } : {}),
      };
    }),
  }));
}

/** Built-in accents the lab edits: code values, then the lab's picks on top. */
export function mergedBuiltinAccents(
  picks: LabPicks,
  keyframes: AccentKeyframeRow[] = mergedKeyframes(picks),
): Record<string, InterfaceAccents> {
  return Object.fromEntries(
    YEARS_WITH_THEME.map((year) => {
      const code = BUILTIN_INTERFACE_ACCENTS[year];
      const pick = picks.builtin[year] ?? {};
      const accent =
        pick.accent ??
        code?.accent ??
        getInterfaceTokens(getThemeForYear(year).colors.primary, {}, keyframes)
          .accent;
      const accent2 = pick.accent2 ?? code?.accent2;

      return [year, { accent, ...(accent2 ? { accent2 } : {}) }];
    }),
  );
}

/** The resolved stop of one keyframe cell (accent2 filled in with the rule). */
export function keyframeCell(
  keyframes: AccentKeyframeRow[],
  hue: number,
  shade: number,
): Required<InterfaceAccents> {
  const stop = keyframes
    .find((row) => row.hue === hue)
    ?.stops.find((candidate) => candidate.shade === shade);

  return {
    accent: stop?.accent ?? getAutoAccents(hue, 30, keyframes).accent,
    accent2: stop?.accent2 ?? defaultAccent2(hue),
  };
}

/** Set (or with `spec: null`, clear) one pick. */
export function withPick(
  picks: LabPicks,
  scope: keyof LabPicks,
  key: string,
  target: AccentTarget,
  spec: AccentSpec | null,
): LabPicks {
  const current = { ...(picks[scope][key] ?? {}) };

  if (spec) current[target] = spec;
  else delete current[target];

  const nextScope = { ...picks[scope] };

  if (Object.keys(current).length > 0) nextScope[key] = current;
  else delete nextScope[key];

  return { ...picks, [scope]: nextScope };
}

/** Contrast of an accent against the modal background (`--p-900`). */
export function accentOnSurfaceContrast(
  tokens: InterfaceTokens,
  accent: AccentSpec,
): number {
  const surfaceL = Math.min(40, Math.max(17, tokens.lightness));
  const surfaceC = Math.min(0.12, Math.max(0.035, tokens.chroma));

  return contrastRatio(
    oklchLuminance(accent.l, accent.c, accent.h),
    oklchLuminance(surfaceL, surfaceC, tokens.hue),
  );
}

/* ------------------------------------------------------------------ */
/* Candidates                                                           */
/* ------------------------------------------------------------------ */

/**
 * A pleasing lightness/chroma for an accent of hue `h`: yellows and greens
 * only read as themselves when light, reds and blues get muddy when light.
 */
const NICE_ACCENT: Array<[number, number, number]> = [
  [0, 66, 0.22], // raspberry pink
  [25, 66, 0.2], // red / coral
  [50, 72, 0.17], // orange
  [75, 80, 0.15], // amber
  [95, 86, 0.15], // gold
  [115, 90, 0.17], // lemon / lime
  [140, 80, 0.18], // green
  [170, 82, 0.13], // mint
  [200, 80, 0.12], // aqua
  [235, 72, 0.13], // sky
  [260, 64, 0.17], // blue
  [290, 64, 0.2], // violet
  [325, 66, 0.23], // magenta
];

export function niceAccentAt(hue: number): AccentSpec {
  const h = ((hue % 360) + 360) % 360;
  let index = NICE_ACCENT.length - 1;

  NICE_ACCENT.forEach(([anchor], i) => {
    if (anchor <= h) index = i;
  });

  const [h0, l0, c0] = NICE_ACCENT[index];
  const [h1, l1, c1] = NICE_ACCENT[(index + 1) % NICE_ACCENT.length];
  const span = (((h1 - h0) % 360) + 360) % 360 || 360;
  const t = ((((h - h0) % 360) + 360) % 360) / span;
  const mixed = mixAccent({ h: h0, l: l0, c: c0 }, { h: h1, l: l1, c: c1 }, t);

  return clampAccentToGamut({ ...mixed, h });
}

/** The pre-lab accent pairing (one fixed partner per hue family), for comparison. */
const LEGACY_ACCENT_BANDS = [
  { upTo: 30, h: 78, l: 72, c: 0.16 },
  { upTo: 110, h: 255, l: 62, c: 0.2 },
  { upTo: 190, h: 55, l: 70, c: 0.17 },
  { upTo: 235, h: 30, l: 66, c: 0.2 },
  { upTo: 285, h: 350, l: 66, c: 0.23 },
  { upTo: 330, h: 355, l: 66, c: 0.24 },
  { upTo: 360, h: 78, l: 72, c: 0.16 },
];

export function legacyAccent(primHue: number): AccentSpec {
  const h = ((primHue % 360) + 360) % 360;
  const band =
    LEGACY_ACCENT_BANDS.find((candidate) => h < candidate.upTo) ??
    LEGACY_ACCENT_BANDS[LEGACY_ACCENT_BANDS.length - 1];

  return { h: band.h, l: band.l, c: band.c };
}

export interface Candidate {
  id: string;
  label: string;
  spec: AccentSpec;
}

/** Brand colours a built-in theme already carries (its scoreboard palette). */
export function getBrandCandidates(year: string): Candidate[] {
  const { colors } = getThemeForYear(year);
  const primHue = lchOf(colors.primary[800])?.H ?? 0;
  const sources: Array<[string, string]> = [
    ['animatedBorder', colors.animatedBorder],
    ['panelInfo.activeBg', colors.panelInfo.activeBg],
    ['juryLastPointsBg', colors.countryItem.juryLastPointsBg],
    ['douzePointsBg', colors.countryItem.douzePointsBg],
    ['televoteFinishedBg', colors.countryItem.televoteFinishedBg],
    ['televoteActiveBg', colors.countryItem.televoteActiveBg],
    ['juryBg', colors.countryItem.juryBg],
    ['appBgColor', colors.appBgColor],
  ];
  const found: Candidate[] = [];

  sources
    .map(([name, value]) => ({ name, lch: lchOf(value) }))
    .filter(({ lch }) => lch && lch.H !== null && lch.C >= 0.07)
    .sort((a, b) => b.lch!.C - a.lch!.C)
    .forEach(({ name, lch }) => {
      const h = lch!.H!;

      if (found.some((c) => Math.abs(hueDelta(c.spec.h, h)) < 15)) return;

      found.push({
        id: `brand:${name}`,
        label: `Brand · ${name}${
          Math.abs(hueDelta(primHue, h)) < 30 ? ' (tonal)' : ''
        }`,
        spec: clampAccentToGamut({
          h,
          l: Math.min(90, Math.max(58, lch!.L)),
          c: Math.max(0.1, lch!.C),
        }),
      });
    });

  return found.slice(0, 3);
}

/**
 * Candidates for one row: what the code has now, the old pairing, and the
 * classic harmonies around the primary hue, each at a hue-appropriate
 * lightness/chroma (`niceAccentAt`).
 */
export function getCandidates(
  target: AccentTarget,
  primHue: number,
  code: Required<InterfaceAccents>,
  applied: Required<InterfaceAccents>,
  brand: Candidate[] = [],
): Candidate[] {
  const at = (id: string, label: string, offset: number): Candidate => ({
    id,
    label,
    spec: niceAccentAt(primHue + offset),
  });
  const tonal: Candidate = {
    id: 'tonal',
    label: 'Tonal (same hue, light)',
    spec: clampAccentToGamut({ h: primHue, l: 84, c: 0.13 }),
  };

  if (target === 'accent') {
    return [
      { id: 'code', label: 'In code', spec: code.accent },
      { id: 'legacy', label: 'Old bands', spec: legacyAccent(primHue) },
      tonal,
      ...brand,
      at('a+45', 'Analogous +45°', 45),
      at('a-45', 'Analogous −45°', -45),
      at('t+120', 'Triad +120°', 120),
      at('t-120', 'Triad −120°', -120),
      at('s+150', 'Split +150°', 150),
      at('s-150', 'Split −150°', -150),
      at('comp', 'Complement', 180),
    ];
  }

  return [
    { id: 'code', label: 'In code', spec: code.accent2 },
    {
      id: 'rule',
      label: 'Old rule (hue − 40°)',
      spec: defaultAccent2(primHue),
    },
    {
      id: 'n+40',
      label: 'Accent +40°',
      spec: niceAccentAt(applied.accent.h + 40),
    },
    {
      id: 'n-40',
      label: 'Accent −40°',
      spec: niceAccentAt(applied.accent.h - 40),
    },
    tonal,
    ...brand,
    at('a+45', 'Analogous +45°', 45),
    at('a-45', 'Analogous −45°', -45),
    at('comp', 'Complement', 180),
  ];
}

/* ------------------------------------------------------------------ */
/* Labels                                                               */
/* ------------------------------------------------------------------ */

export function themeLabel(year: string): string {
  return year.startsWith('JESC-') ? `JESC ${year.slice(5)}` : `ESC ${year}`;
}

export const formatSpec = ({ h, l, c }: AccentSpec) =>
  `${Math.round(h)}° · L${Math.round(l)} · C${c.toFixed(2)}`;

export const sameSpec = (a: AccentSpec, b: AccentSpec) =>
  Math.abs(hueDelta(a.h, b.h)) < 0.6 &&
  Math.abs(a.l - b.l) < 0.6 &&
  Math.abs(a.c - b.c) < 0.004;

/** A theme colour string (`hsl(...)`, hex or a bare `h s% l%` triplet) as CSS. */
export const cssColor = (value: string) =>
  /^(hsl|rgb|#)/i.test(value.trim()) ? value : `hsl(${value})`;
