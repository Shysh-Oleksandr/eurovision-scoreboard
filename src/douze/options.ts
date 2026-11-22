import { paletteFromColors } from './flagPalette';
import type { DouzeAnimationSpec, DouzeKeyframe, DouzeLayer } from './model';

/**
 * A custom theme's changes to its douze animation ("Customize animation" in
 * the theme editor): colours, pace, parts and the strength of the glows. A
 * small diff over an animation built by hand, so every combination still
 * looks finished. Spec animations take them through `applyDouzeOptions`,
 * the hand-written hearts and parallelograms read them directly; what each
 * animation offers is its `DouzeOptionsSupport` (registry.ts). Stored on the
 * theme as `douzeOptions`; the backend's `normalizeDouzeOptions`
 * (douze-points-backend/src/themes/theme-douze-options.ts) keeps the same
 * rules.
 */
export interface DouzeOptions {
  /** Where the colours come from. Absent: the animation's own. */
  colors?: DouzeColorSource;
  /** With `colors: 'custom'`: three `#rrggbb` colours. */
  custom?: string[];
  /** Playback speed, 0.5–2. Absent: 1. */
  speed?: number;
  /** Parts switched off (ids from the animation's `parts`). */
  off?: string[];
  /** Strength of the glows, 0–1. Absent: 1. */
  glow?: number;
  /** Strength of the wash (the white veil), 0–1. Absent: 1. */
  wash?: number;
  /** The veil's colour, `#rrggbb`. Absent: white. */
  veil?: string;
  /** The hearts cover the flag too (they start at its edge by default). */
  coverFlag?: boolean;
}

export type DouzeColorSource = 'flag' | 'theme' | 'custom';

/** A colour choice in the editor: a source, or the animation's fixed palette. */
export type DouzeColorChoice = DouzeColorSource | 'original';

/**
 * A theme colour (`countryItem.<key>` override) the animation uses, edited
 * in "Customize animation". `when`: always, unless the flag colours replace
 * it, or only with the theme colours chosen. Hidden while `part` is off.
 */
export interface DouzeThemeColorField {
  key:
    | 'douzePointsBg'
    | 'douzePointsText'
    | 'douzePointsBlock1'
    | 'douzePointsBlock2';
  /** Label key under `widgets.themes.visualDetails.douzeOptions.colorFields`. */
  label: string;
  when: 'always' | 'notFlag' | 'theme';
  part?: string;
  gradient?: boolean;
  opacity?: boolean;
}

/** What an animation lets a custom theme change. */
export interface DouzeOptionsSupport {
  /** The colour choices, the animation's own first (stored as no `colors`). */
  colors: DouzeColorChoice[];
  /** The theme colours it uses. */
  themeColors: DouzeThemeColorField[];
  /** Parts that can be switched off, in the editor's order. */
  parts: string[];
  /** Strength sliders. */
  strengths: ('glow' | 'wash')[];
  /** The veil's colour can be changed. */
  veilColor: boolean;
  /** The animation can be drawn over the flag too (`coverFlag`). */
  coverFlag: boolean;
  /** How many custom colours it uses (the editor's swatches; 2026: one). */
  customColors: number;
  /**
   * With theme colours, some come from the Colors step (the 12 box and the
   * name text, 2022), which the editor says.
   */
  themeColorsHint: boolean;
}

export const DOUZE_COLOR_SOURCES: DouzeColorSource[] = [
  'flag',
  'theme',
  'custom',
];
export const DOUZE_SPEED_RANGE = [0.5, 2] as const;
export const DEFAULT_VEIL_COLOR = '#ffffff';

const HEX = /^#[0-9a-f]{6}$/i;
const PART_ID = /^[a-z][a-zA-Z0-9]{0,23}$/;
const MAX_PARTS = 16;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const round2 = (value: number) => Math.round(value * 100) / 100;

const clampedNumber = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? round2(Math.min(max, Math.max(min, value)))
    : undefined;

/**
 * Valid options from anything (a stored theme, an API response): unknown
 * keys dropped, numbers clamped, defaults left out. Null when nothing is
 * left, so "all defaults" is stored as no options at all.
 */
export const sanitizeDouzeOptions = (value: unknown): DouzeOptions | null => {
  if (!isRecord(value)) return null;

  const options: DouzeOptions = {};

  if (DOUZE_COLOR_SOURCES.includes(value.colors as DouzeColorSource)) {
    const colors = value.colors as DouzeColorSource;

    if (colors !== 'custom') {
      options.colors = colors;
    } else if (
      Array.isArray(value.custom) &&
      value.custom.length === 3 &&
      value.custom.every(
        (color) => typeof color === 'string' && HEX.test(color),
      )
    ) {
      options.colors = 'custom';
      options.custom = (value.custom as string[]).map((color) =>
        color.toLowerCase(),
      );
    }
  }

  const speed = clampedNumber(value.speed, ...DOUZE_SPEED_RANGE);

  if (speed !== undefined && speed !== 1) options.speed = speed;

  if (Array.isArray(value.off)) {
    const off = [
      ...new Set(
        value.off.filter(
          (id): id is string => typeof id === 'string' && PART_ID.test(id),
        ),
      ),
    ]
      .slice(0, MAX_PARTS)
      .sort();

    if (off.length > 0) options.off = off;
  }

  (['glow', 'wash'] as const).forEach((key) => {
    const strength = clampedNumber(value[key], 0, 1);

    if (strength !== undefined && strength !== 1) options[key] = strength;
  });

  if (typeof value.veil === 'string' && HEX.test(value.veil)) {
    const veil = value.veil.toLowerCase();

    if (veil !== DEFAULT_VEIL_COLOR) options.veil = veil;
  }

  if (value.coverFlag === true) options.coverFlag = true;

  return Object.keys(options).length > 0 ? options : null;
};

/**
 * Only what the animation offers: a colour choice it doesn't have (or its
 * own), parts it doesn't have and sliders it doesn't show are dropped. What
 * the editor saves and plays, so switching animations never stores options
 * that do nothing. Speed applies to every animation.
 */
export const restrictDouzeOptions = (
  options: DouzeOptions | null | undefined,
  support: DouzeOptionsSupport | null,
): DouzeOptions | null => {
  const valid = sanitizeDouzeOptions(options);

  if (!valid || !support) return null;

  const restricted: DouzeOptions = { ...valid };

  if (
    !restricted.colors ||
    !support.colors.includes(restricted.colors) ||
    restricted.colors === support.colors[0]
  ) {
    delete restricted.colors;
    delete restricted.custom;
  }
  restricted.off = restricted.off?.filter((id) => support.parts.includes(id));
  if (!support.strengths.includes('glow')) delete restricted.glow;
  if (!support.strengths.includes('wash')) delete restricted.wash;
  if (!support.veilColor) delete restricted.veil;
  if (!support.coverFlag) delete restricted.coverFlag;

  return sanitizeDouzeOptions(restricted);
};

/** How much longer than built the animation runs (1 / speed). */
export const douzeDurationScale = (options: DouzeOptions | null | undefined) =>
  1 / (sanitizeDouzeOptions(options)?.speed ?? 1);

const scaleOpacity = (
  keyframes: DouzeKeyframe[],
  factor: number,
): DouzeKeyframe[] => {
  if (!keyframes.some((frame) => frame.opacity !== undefined)) {
    // Opacity never set: the layer is fully shown throughout.
    return keyframes.map((frame, index) =>
      index === 0 ? { ...frame, opacity: factor } : frame,
    );
  }

  return keyframes.map((frame) =>
    frame.opacity === undefined
      ? frame
      : { ...frame, opacity: Math.min(1, frame.opacity * factor) },
  );
};

const atSpeed = (layer: DouzeLayer, speed: number): DouzeLayer => {
  const keyframes = layer.keyframes.map((frame) => ({
    ...frame,
    t: frame.t / speed,
  }));

  return layer.kind === 'canvas' && layer.painter.type === 'waveFlow'
    ? {
        ...layer,
        keyframes,
        // The waves cover the same ground in the shorter time.
        painter: { ...layer.painter, speed: layer.painter.speed * speed },
      }
    : { ...layer, keyframes };
};

/**
 * The spec with the options applied. Pure; parts switched off and layers
 * at zero strength are left out (nothing to draw), and the speed rescales
 * the clock, so the player, the board's move delay and the lab all follow
 * the returned spec.
 */
export const applyDouzeOptions = (
  spec: DouzeAnimationSpec,
  options: DouzeOptions,
): DouzeAnimationSpec => {
  const off = new Set(options.off ?? []);
  const speed = options.speed ?? 1;
  const strengthOf = (layer: DouzeLayer) =>
    layer.intensity ? options[layer.intensity] ?? 1 : 1;

  const layers = spec.layers
    .filter((layer) => !(layer.group && off.has(layer.group)))
    .filter((layer) => strengthOf(layer) > 0)
    .map((layer) => {
      const strength = strengthOf(layer);
      const scaled =
        strength === 1
          ? layer
          : { ...layer, keyframes: scaleOpacity(layer.keyframes, strength) };

      return speed === 1 ? scaled : atSpeed(scaled, speed);
    });

  const applied: DouzeAnimationSpec = {
    ...spec,
    durationMs: spec.durationMs / speed,
    layers,
  };

  if (spec.moveAtMs !== undefined) applied.moveAtMs = spec.moveAtMs / speed;

  if (options.veil) {
    applied.palette = { ...spec.palette, veil: options.veil };
  }

  if (options.colors === 'custom' && options.custom) {
    applied.palette = {
      ...applied.palette,
      ...paletteFromColors(options.custom, { lift: false }),
    };
    delete applied.paletteFrom;
  } else if (options.colors === 'flag' || options.colors === 'theme') {
    applied.paletteFrom = options.colors;
  }

  return applied;
};

const cache = new WeakMap<
  DouzeAnimationSpec,
  Map<string, DouzeAnimationSpec>
>();

/** `applyDouzeOptions`, the same object for the same spec and options. */
export const withDouzeOptions = (
  spec: DouzeAnimationSpec,
  options: DouzeOptions | null | undefined,
): DouzeAnimationSpec => {
  const valid = sanitizeDouzeOptions(options);

  if (!valid) return spec;

  const key = JSON.stringify(valid);
  let bySpec = cache.get(spec);

  if (!bySpec) {
    bySpec = new Map();
    cache.set(spec, bySpec);
  }

  let applied = bySpec.get(key);

  if (!applied) {
    applied = applyDouzeOptions(spec, valid);
    bySpec.set(key, applied);
  }

  return applied;
};
