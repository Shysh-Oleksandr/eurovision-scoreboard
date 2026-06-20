/**
 * Canonical content fingerprint for a theme — two themes with the same
 * fingerprint render identically. Used to detect unmodified remixes so the
 * UI can block publishing a copy that the user didn't actually change.
 *
 * Mirrors the backend canonicalization in
 * douze-points-backend/src/themes/theme-fingerprint.ts. Intentionally EXCLUDES
 * name, description, visibility and other metadata — only visual content.
 */
export interface ThemeContentInput {
  baseThemeYear?: string;
  hue?: number;
  shadeValue?: number;
  overrides?: Record<string, string> | null;
  /** Resolved background URL/key marker; empty string when none. */
  background?: string;
  pointsContainerShape?: string;
  uppercaseEntryName?: boolean;
  juryActivePointsUnderline?: boolean;
  isJuryPointsPanelRounded?: boolean;
  flagShape?: string;
  usePointsCountUpAnimation?: boolean;
  roundedCountryContainer?: boolean;
  boardAnimationMode?: string;
  douzePointsAnimationMode?: string;
  themeSounds?: Record<
    string,
    { url?: string; delayMs?: number } | null | undefined
  > | null;
  fontAlias?: string;
}

const sortedOverrides = (
  overrides?: Record<string, string> | null,
): Array<[string, string]> =>
  Object.entries(overrides ?? {})
    .filter(([, v]) => Boolean(v))
    .sort(([a], [b]) => a.localeCompare(b));

const normalizedSounds = (
  sounds?: ThemeContentInput['themeSounds'],
): Array<[string, { url: string; delayMs: number }]> =>
  Object.entries(sounds ?? {})
    .filter(([, slot]) => slot && typeof slot.url === 'string' && slot.url)
    .map(([event, slot]) => {
      const s = slot as { url: string; delayMs?: number };

      return [event, { url: s.url, delayMs: s.delayMs ?? 0 }] as [
        string,
        { url: string; delayMs: number },
      ];
    })
    .sort(([a], [b]) => a.localeCompare(b));

/** Stable, order-independent canonical JSON string for content comparison. */
export const themeContentFingerprint = (input: ThemeContentInput): string =>
  JSON.stringify({
    baseThemeYear: input.baseThemeYear ?? '2026',
    hue: input.hue ?? null,
    shadeValue: input.shadeValue ?? 60,
    overrides: sortedOverrides(input.overrides),
    background: input.background ?? '',
    pointsContainerShape: input.pointsContainerShape ?? null,
    uppercaseEntryName: input.uppercaseEntryName ?? null,
    juryActivePointsUnderline: input.juryActivePointsUnderline ?? null,
    isJuryPointsPanelRounded: input.isJuryPointsPanelRounded ?? null,
    flagShape: input.flagShape ?? null,
    usePointsCountUpAnimation: input.usePointsCountUpAnimation ?? null,
    roundedCountryContainer: input.roundedCountryContainer ?? null,
    boardAnimationMode: input.boardAnimationMode ?? null,
    douzePointsAnimationMode: input.douzePointsAnimationMode ?? null,
    themeSounds: normalizedSounds(input.themeSounds),
    fontAlias: input.fontAlias ?? null,
  });

/**
 * Remove any trailing " (Copy)" repetitions a legacy theme name may carry, so
 * remixing doesn't keep stacking the suffix (e.g. "Aurora (Copy) (Copy)").
 */
export const stripCopySuffix = (name: string): string =>
  name.replace(/(\s*\(Copy\))+\s*$/i, '').trim() || name.trim();
