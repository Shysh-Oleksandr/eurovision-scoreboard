import { CustomThemeSnapshot, DesignTheme } from './design';

import { getFontCssVars } from '@/theme/customFonts';
import {
  ActiveFonts,
  resolveFontsFromSpecifics,
  resolveThemeFonts,
} from '@/theme/fontResolution';
import { getThemeInterfaceVars } from '@/theme/oklch';
import { getThemeForYear, JUNIOR_YEARS_WITH_THEME } from '@/theme/themes';
import { ThemeScopeValue } from '@/theme/ThemeScope';
import { resolveThemeSpecificsForBaseThemeYear } from '@/theme/themeSpecifics';
import {
  getCssVarsForCustomTheme,
  getCustomThemeInterfaceVars,
  toCssVarMap,
} from '@/theme/themeUtils';
import { CustomTheme } from '@/types/customTheme';

/**
 * Helpers around `design.theme` (see design.ts): building it from the app's
 * active theme, turning it back into a `ThemeScope` for the renderers, the
 * inline CSS variables that scope the Tailwind palette and the fonts to the
 * design node, and a display name.
 */

const JUNIOR_PREFIX = 'JESC-';

/** Keep only what rendering needs; drop sounds, stats, ownership. */
export function toCustomThemeSnapshot(theme: CustomTheme): CustomTheme {
  const {
    _id,
    name,
    baseThemeYear,
    hue,
    shadeValue,
    overrides,
    backgroundImageUrl,
    themeSpecifics,
    pointsContainerShape,
    uppercaseEntryName,
    juryActivePointsUnderline,
    isJuryPointsPanelRounded,
    flagShape,
    usePointsCountUpAnimation,
    roundedCountryContainer,
    boardAnimationMode,
    douzePointsAnimationMode,
    fontAlias,
    fontId,
    scoreboardFontAlias,
    scoreboardFontId,
    customFonts,
  } = theme;

  const snapshot: Partial<CustomTheme> = {
    _id,
    name,
    baseThemeYear,
    hue,
    overrides: overrides ?? {},
  };
  const optional: Partial<CustomTheme> = {
    shadeValue,
    backgroundImageUrl,
    themeSpecifics,
    pointsContainerShape,
    uppercaseEntryName,
    juryActivePointsUnderline,
    isJuryPointsPanelRounded,
    flagShape,
    usePointsCountUpAnimation,
    roundedCountryContainer,
    boardAnimationMode,
    douzePointsAnimationMode,
    fontAlias,
    fontId,
    scoreboardFontAlias,
    scoreboardFontId,
    customFonts,
  };

  (Object.keys(optional) as (keyof CustomTheme)[]).forEach((key) => {
    if (optional[key] !== undefined) {
      (snapshot as Record<string, unknown>)[key] = optional[key];
    }
  });

  return snapshot as CustomTheme;
}

/** The app's active theme as a design theme. */
export function designThemeFromActive(state: {
  themeYear: string;
  customTheme: CustomTheme | null;
}): DesignTheme {
  return state.customTheme
    ? {
        kind: 'custom',
        theme: toCustomThemeSnapshot(
          state.customTheme,
        ) as unknown as CustomThemeSnapshot,
      }
    : { kind: 'year', year: state.themeYear };
}

/** What the renderers read through `useScopedTheme()`. */
export function designThemeToScope(theme: DesignTheme): ThemeScopeValue {
  if (theme.kind === 'custom') {
    const custom = theme.theme as unknown as CustomTheme;

    return { themeYear: custom.baseThemeYear, customTheme: custom };
  }

  return { themeYear: theme.year, customTheme: null };
}

export function resolveDesignThemeFonts(theme: DesignTheme): ActiveFonts {
  if (theme.kind === 'custom') {
    return resolveThemeFonts(theme.theme as unknown as CustomTheme);
  }

  return resolveFontsFromSpecifics(
    resolveThemeSpecificsForBaseThemeYear(theme.year),
    null,
  );
}

/**
 * Inline variables for the design node: the `--twc-*` palette the country
 * rows and theme fills use, the interface tokens, and both font slots. Set
 * inline so the node ignores whatever the document's `<html>` carries.
 */
export function designThemeCssVars(theme: DesignTheme): Record<string, string> {
  const fonts = getFontCssVars(resolveDesignThemeFonts(theme));

  if (theme.kind === 'custom') {
    const custom = theme.theme as unknown as CustomTheme;

    return {
      ...getCssVarsForCustomTheme(custom),
      ...getCustomThemeInterfaceVars(custom),
      ...fonts,
    };
  }

  return {
    ...toCssVarMap(getThemeForYear(theme.year).colors),
    ...getThemeInterfaceVars(theme.year),
    ...fonts,
  };
}

/** "ESC 2026", "JESC 2024" or the custom theme's name. */
export function yearThemeLabel(year: string): string {
  if (year.startsWith(JUNIOR_PREFIX) || JUNIOR_YEARS_WITH_THEME.includes(year))
    return `JESC ${year.replace(JUNIOR_PREFIX, '')}`;

  return `ESC ${year}`;
}

export function designThemeLabel(theme: DesignTheme): string {
  return theme.kind === 'custom'
    ? theme.theme.name
    : yearThemeLabel(theme.year);
}

export function sameDesignTheme(a: DesignTheme, b: DesignTheme): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'year' && b.kind === 'year') return a.year === b.year;
  if (a.kind === 'custom' && b.kind === 'custom')
    return a.theme._id === b.theme._id;

  return false;
}
