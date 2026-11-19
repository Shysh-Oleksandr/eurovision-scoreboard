import { useGeneralStore } from '@/state/generalStore';

/**
 * The theme a save stores with the contest: the custom theme if one is on,
 * else the built-in theme. Only sent together with a snapshot: a details-only
 * save never changes a contest's theme.
 */
export const getContestThemePayload = (): {
  themeId?: string;
  standardThemeId?: string;
} => {
  const { customTheme, themeYear } = useGeneralStore.getState();

  if (customTheme?._id) return { themeId: customTheme._id };

  return themeYear ? { standardThemeId: themeYear } : {};
};

/** A contest year as typed: a whole number from 1 to 9999, else null. */
export const parseContestYear = (value: string | number): number | null => {
  const text = String(value).trim();

  if (!/^\d{1,4}$/.test(text)) return null;
  const year = Number(text);

  return year >= 1 ? year : null;
};

/** Stage and country counts of a snapshot built from the stores. */
export const countSnapshotLineup = (snapshot: {
  setup?: { stages?: Array<{ participants?: string[] }> };
}): { stages: number; countries: number } => {
  const stages = snapshot.setup?.stages ?? [];
  const codes = new Set<string>();

  stages.forEach((stage) =>
    stage.participants?.forEach((code) => codes.add(code)),
  );

  return { stages: stages.length, countries: codes.size };
};
