import { ContestType, getContestKey } from '@/data/contestTypes';
import { useGeneralStore } from '@/state/generalStore';
import { YEARS_WITH_THEME } from '@/theme/themes';

/** Theme registry key that matches a contest year (`2026`, `JESC-2025`, `ASIA-2026`). */
export const getExpectedThemeKey = (
  year: string,
  contestType: ContestType,
): string => getContestKey(year, contestType);

export const hasThemeForContest = (
  year: string,
  contestType: ContestType,
): boolean => YEARS_WITH_THEME.includes(getExpectedThemeKey(year, contestType));

/**
 * Apply the built-in theme of the current contest year when the
 * "Sync theme to contest year" setting is on (or `force` is set).
 * Returns whether a theme change was applied. Years without a theme are a
 * no-op so the user's current theme is never silently dropped.
 */
export function applyThemeForContestYear({
  force = false,
}: { force?: boolean } = {}): boolean {
  const state = useGeneralStore.getState();

  if (!force && !state.settings.syncThemeWithContest) return false;

  const key = getExpectedThemeKey(state.year, state.settings.contestType);

  if (!YEARS_WITH_THEME.includes(key)) return false;
  if (!state.customTheme && state.themeYear === key) return false;

  state.setTheme(key);

  return true;
}
