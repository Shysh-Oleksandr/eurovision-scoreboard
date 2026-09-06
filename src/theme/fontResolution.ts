import { normalizeFontAlias } from './fontAliases';
import { resolveThemeSpecificsForGeneralState } from './themeSpecifics';
import { ThemeSpecifics } from './types';

import { CustomTheme } from '@/types/customTheme';
import type { ThemeFontSnapshot } from '@/types/font';

/**
 * Which font a slot should render: a bundled alias, or an uploaded font whose
 * `@font-face` rules come from the snapshot (with an alias as the fallback
 * stack while the files load / if they 404).
 */
export type FontResolution =
  | { kind: 'builtin'; alias: string }
  | { kind: 'custom'; snapshot: ThemeFontSnapshot; fallbackAlias: string };

export type ActiveFonts = {
  ui: FontResolution;
  scoreboard: FontResolution;
  /** True when the scoreboard slot simply follows the UI font. */
  scoreboardInherits: boolean;
};

const builtin = (alias?: string | null): FontResolution => ({
  kind: 'builtin',
  alias: normalizeFontAlias(alias),
});

const custom = (
  snapshot: ThemeFontSnapshot,
  fallbackAlias?: string | null,
): FontResolution => ({
  kind: 'custom',
  snapshot,
  fallbackAlias: normalizeFontAlias(fallbackAlias),
});

/** A snapshot only counts if it belongs to the id the theme currently references (stale copies degrade to the alias). */
const snapshotFor = (
  id: string | undefined,
  snapshot: ThemeFontSnapshot | undefined,
): ThemeFontSnapshot | undefined =>
  id && snapshot && snapshot._id === id && snapshot.faces?.length
    ? snapshot
    : undefined;

/** Resolve both slots from already-merged specifics + the custom theme's font references. */
export function resolveFontsFromSpecifics(
  specifics: Pick<ThemeSpecifics, 'fontAlias' | 'scoreboardFontAlias'>,
  customTheme: CustomTheme | null,
): ActiveFonts {
  const uiSnapshot = snapshotFor(
    customTheme?.fontId,
    customTheme?.customFonts?.ui,
  );
  const ui = uiSnapshot
    ? custom(uiSnapshot, specifics.fontAlias)
    : builtin(specifics.fontAlias);

  const scoreboardSnapshot = snapshotFor(
    customTheme?.scoreboardFontId,
    customTheme?.customFonts?.scoreboard,
  );

  if (scoreboardSnapshot) {
    return {
      ui,
      scoreboard: custom(
        scoreboardSnapshot,
        specifics.scoreboardFontAlias ?? specifics.fontAlias,
      ),
      scoreboardInherits: false,
    };
  }

  if (specifics.scoreboardFontAlias) {
    return {
      ui,
      scoreboard: builtin(specifics.scoreboardFontAlias),
      scoreboardInherits: false,
    };
  }

  return { ui, scoreboard: ui, scoreboardInherits: true };
}

/** Fonts a theme would use on its own (cards, editor preview) — the account override is ignored. */
export function resolveThemeFonts(customTheme: CustomTheme): ActiveFonts {
  const specifics = resolveThemeSpecificsForGeneralState({
    themeYear: customTheme.baseThemeYear,
    customTheme,
  });

  return resolveFontsFromSpecifics(specifics, customTheme);
}

export type ResolveActiveFontsInput = {
  themeYear: string;
  customTheme: CustomTheme | null;
  overrideThemeFont: boolean;
  overrideThemeFontAlias?: string | null;
};

/**
 * Fonts the document should render right now. The account-level override
 * wins over everything and forces one bundled font into both slots.
 */
export function resolveActiveFonts({
  themeYear,
  customTheme,
  overrideThemeFont,
  overrideThemeFontAlias,
}: ResolveActiveFontsInput): ActiveFonts {
  if (overrideThemeFont) {
    const ui = builtin(overrideThemeFontAlias);

    return { ui, scoreboard: ui, scoreboardInherits: true };
  }

  const specifics = resolveThemeSpecificsForGeneralState({
    themeYear,
    customTheme,
  });

  return resolveFontsFromSpecifics(specifics, customTheme);
}
