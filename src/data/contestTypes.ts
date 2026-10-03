/** Which contest series a preset belongs to. */
export type ContestType = 'esc' | 'jesc' | 'asia';

/** Prefix of the contest select / theme key for each non-ESC series (`JESC-2025`, `ASIA-2026`). */
export const CONTEST_KEY_PREFIXES: Record<
  Exclude<ContestType, 'esc'>,
  string
> = {
  jesc: 'JESC-',
  asia: 'ASIA-',
};

/** Default `settings.contestName` when switching to a series. */
export const CONTEST_TYPE_NAMES: Record<ContestType, string> = {
  esc: 'Eurovision',
  jesc: 'Junior Eurovision',
  asia: 'Eurovision Asia',
};

/** Contest select / theme registry key for a year of a series (`2026`, `JESC-2025`, `ASIA-2026`). */
export const getContestKey = (year: string, contestType: ContestType) =>
  contestType === 'esc' ? year : `${CONTEST_KEY_PREFIXES[contestType]}${year}`;

/** Inverse of `getContestKey`. */
export const parseContestKey = (
  key: string,
): { year: string; contestType: ContestType } => {
  for (const [contestType, prefix] of Object.entries(CONTEST_KEY_PREFIXES)) {
    if (key.startsWith(prefix)) {
      return {
        year: key.slice(prefix.length),
        contestType: contestType as ContestType,
      };
    }
  }

  return { year: key, contestType: 'esc' };
};

/**
 * Contest type of persisted settings or a saved snapshot setup. Data written
 * before `contestType` existed only carries the `isJuniorContest` boolean.
 */
export const resolveContestType = (source?: {
  contestType?: ContestType;
  isJuniorContest?: boolean;
}): ContestType =>
  source?.contestType ?? (source?.isJuniorContest ? 'jesc' : 'esc');
