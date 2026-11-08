import type { EntryStatsParticipation } from '@/types/entryStats';

type ContestOrderFields = Pick<
  EntryStatsParticipation,
  'year' | 'contestCreatedAt' | 'contestName'
>;

/** Newest first: by year, then by when the contest was created, then by name. */
export function sortContestsNewestFirst<T extends ContestOrderFields>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((a, b) => {
    const yearCmp = (b.year ?? -Infinity) - (a.year ?? -Infinity);

    if (yearCmp !== 0) return yearCmp;

    const aTs = a.contestCreatedAt
      ? new Date(a.contestCreatedAt).getTime()
      : -Infinity;
    const bTs = b.contestCreatedAt
      ? new Date(b.contestCreatedAt).getTime()
      : -Infinity;

    if (bTs !== aTs) return bTs - aTs;

    return a.contestName.localeCompare(b.contestName);
  });
}

export interface EntryStreaks {
  /** Finals reached from a semi-final in a row, counting back from the newest. */
  currentQualifying: number;
  longestQualifying: number;
  longestNonQualifying: number;
  longestTop10: number;
  longestWins: number;
}

/**
 * Streaks over participations sorted newest first. Qualifying runs only see
 * contests where the entry competed in a semi-final: pre-qualified entries
 * and final-only contests neither extend nor break them.
 */
export function computeEntryStreaks(
  newestFirst: readonly EntryStatsParticipation[],
  entryCode: string,
): EntryStreaks {
  const runs = {
    qualifying: 0,
    nonQualifying: 0,
    top10: 0,
    wins: 0,
  };
  const longest = { ...runs };

  const step = (key: keyof typeof runs, hit: boolean) => {
    runs[key] = hit ? runs[key] + 1 : 0;
    longest[key] = Math.max(longest[key], runs[key]);
  };

  let currentQualifying = 0;
  let currentOpen = true;

  for (const p of newestFirst) {
    const isFinal = p.status === 'FINAL';

    if (p.semi) {
      step('qualifying', isFinal);
      step('nonQualifying', !isFinal);
      if (!isFinal) currentOpen = false;
      else if (currentOpen) currentQualifying += 1;
    }

    step('top10', isFinal && (p.gfRank ?? Infinity) <= 10);
    step('wins', p.winnerCode === entryCode);
  }

  return {
    currentQualifying,
    longestQualifying: longest.qualifying,
    longestNonQualifying: longest.nonQualifying,
    longestTop10: longest.top10,
    longestWins: longest.wins,
  };
}
