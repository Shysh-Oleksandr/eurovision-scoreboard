import type { DouzeAnimationSpec, DouzeThemeColorKey } from './model';
import {
  type DouzeOptions,
  type DouzeOptionsSupport,
  type DouzeThemeColorField,
  withDouzeOptions,
} from './options';
import { year2021Douze } from './specs/year2021';
import { year2022Douze } from './specs/year2022';
import { year2023Douze } from './specs/year2023';
import { year2024Douze } from './specs/year2024';
import { year2026Douze } from './specs/year2026';
import { DEFAULT_THEME_COLORS } from './themePalette';

import type {
  BoardAnimationMode,
  DouzePointsAnimationMode,
} from '@/theme/types';

/** Douze modes played from a spec (the rest are the hand-written variants). */
const SPECS: Partial<Record<DouzePointsAnimationMode, DouzeAnimationSpec>> = {
  year2021: year2021Douze,
  year2022: year2022Douze,
  year2023: year2023Douze,
  year2024: year2024Douze,
  year2026: year2026Douze,
};

/** Modes with a spec (tests check each one; the lab lists its own). */
export const DOUZE_SPEC_MODES = Object.keys(
  SPECS,
) as DouzePointsAnimationMode[];

/**
 * The mode's spec, with a custom theme's options applied (the same object
 * for the same options). Null for the hand-written variants.
 */
export const getDouzeSpec = (
  mode: DouzePointsAnimationMode | undefined,
  options?: DouzeOptions | null,
): DouzeAnimationSpec | null => {
  const spec = mode ? SPECS[mode] ?? null : null;

  return spec && withDouzeOptions(spec, options);
};

/**
 * What the hand-written animations let a custom theme change: their own
 * colours are the theme's douze colours (Colors tab), and a flag's colours
 * can replace them (DouzePointsAnimation.tsx).
 */
const HAND_WRITTEN_SUPPORT: Partial<
  Record<DouzePointsAnimationMode, DouzeOptionsSupport>
> = {
  heartsGrid: {
    colors: ['theme', 'flag'],
    themeColors: [
      { key: 'douzePointsBg', label: 'hearts', when: 'notFlag', opacity: true },
      { key: 'douzePointsText', label: 'name', when: 'always', part: 'name' },
    ],
    parts: ['name'],
    strengths: [],
    veilColor: false,
    coverFlag: true,
    customColors: 0,
    themeColorsHint: false,
  },
  parallelograms: {
    colors: ['theme', 'flag'],
    themeColors: [
      {
        key: 'douzePointsBg',
        label: 'background',
        when: 'always',
        gradient: true,
        opacity: true,
      },
      { key: 'douzePointsText', label: 'text', when: 'always', part: 'label' },
      {
        key: 'douzePointsBlock1',
        label: 'block1',
        when: 'notFlag',
        part: 'blocks',
      },
      {
        key: 'douzePointsBlock2',
        label: 'block2',
        when: 'notFlag',
        part: 'blocks',
      },
    ],
    parts: ['blocks', 'label'],
    strengths: [],
    veilColor: false,
    // Its overlay already spans the whole row.
    coverFlag: false,
    customColors: 0,
    themeColorsHint: false,
  },
};

/**
 * The theme's douze colours a spec's palette can take, edited in "Customize
 * animation" while theme colours are chosen (the 12 box and name colours
 * are row colours, from the Colors step).
 */
const THEME_COLOR_FIELDS: Partial<
  Record<DouzeThemeColorKey, DouzeThemeColorField>
> = {
  douzePointsBg: { key: 'douzePointsBg', label: 'douze', when: 'theme' },
  douzePointsText: { key: 'douzePointsText', label: 'text', when: 'theme' },
  douzePointsBlock1: {
    key: 'douzePointsBlock1',
    label: 'block1',
    when: 'theme',
  },
};

/**
 * How many of `c1`–`c3` the spec's layers use (the custom colours the
 * editor shows): the highest one referenced. The derived keys (`glow`,
 * `sheen`, `shade`, `ink`) come from c1.
 */
const usedColorCount = (spec: DouzeAnimationSpec): number => {
  const text = JSON.stringify(spec.layers);
  const used = [...text.matchAll(/var\(--douze-c([123])\)/g)].map((match) =>
    Number(match[1]),
  );

  return Math.max(
    /var\(--douze-(glow|sheen|shade|ink)\)/.test(text) ? 1 : 0,
    ...used,
  );
};

/**
 * What "Customize animation" offers for the mode: a spec's from its parts,
 * colour source and tagged layers, the hand-written ones' from the table
 * above. Null for a mode with nothing to change.
 */
export const getDouzeOptionsSupport = (
  mode: DouzePointsAnimationMode | undefined,
): DouzeOptionsSupport | null => {
  if (!mode) return null;

  const spec = SPECS[mode];

  if (!spec) return HAND_WRITTEN_SUPPORT[mode] ?? null;

  const strengths = (['glow', 'wash'] as const).filter((key) =>
    spec.layers.some((layer) => layer.intensity === key),
  );
  const customColors = usedColorCount(spec);
  // The theme colours the used keys come from with theme colours.
  const themeKeys = (spec.themeColors ?? DEFAULT_THEME_COLORS).slice(
    0,
    customColors,
  );

  return {
    colors: [
      ...(spec.paletteFrom ? [spec.paletteFrom] : ['original' as const]),
      ...(['flag', 'theme', 'custom'] as const).filter(
        (source) => source !== spec.paletteFrom,
      ),
    ],
    // With the theme's colours, the douze ones among them (themePalette.ts).
    themeColors: themeKeys.flatMap((key) => THEME_COLOR_FIELDS[key] ?? []),
    parts: spec.parts ?? [],
    strengths,
    veilColor: strengths.includes('wash') && 'veil' in spec.palette,
    coverFlag: false,
    customColors,
    themeColorsHint: themeKeys.some(
      (key) => key === 'juryLastPointsBg' || key === 'juryCountryText',
    ),
  };
};

/** The animation plays where the row is, and the row climbs afterwards. */
export const doesDouzePlayBeforeMove = (
  mode: DouzePointsAnimationMode | undefined,
) => getDouzeSpec(mode)?.reorder === 'after';

/**
 * How long the board waits after a 12 before it moves (ms): past the
 * animation for one that plays first (`reorder: 'after'`), the spec's
 * `moveAtMs` on a flipping board (the 2021 row flies raised), else 1000.
 */
export const getDouzeMoveDelayMs = (
  mode: DouzePointsAnimationMode | undefined,
  options?: DouzeOptions | null,
  boardAnimationMode?: BoardAnimationMode,
): number => {
  const spec = getDouzeSpec(mode, options);

  if (spec?.reorder === 'after') return Math.round(spec.durationMs) + 150;
  if (spec?.moveAtMs !== undefined && boardAnimationMode === 'flip') {
    return Math.round(spec.moveAtMs);
  }

  return 1000;
};
