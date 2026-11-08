import { describe, expect, it } from 'vitest';

import { computeEntryStreaks, sortContestsNewestFirst } from './entryStats';

import type { EntryStatsParticipation } from '@/types/entryStats';

let id = 0;
/** Competed in a semi-final unless `preQualified`. */
const row = (
  status: 'FINAL' | 'NQ',
  opts: { rank?: number; winner?: string; preQualified?: boolean } = {},
): EntryStatsParticipation => ({
  contestId: String((id += 1)),
  contestName: `Contest ${id}`,
  status,
  gfRank: opts.rank,
  winnerCode: opts.winner,
  ...(opts.preQualified
    ? { preQualified: true }
    : {
        semi: { stageId: 'SF1', stageName: 'SF1', rank: 1, size: 3, points: 9 },
      }),
});

describe('computeEntryStreaks', () => {
  it('counts current and longest runs over a newest-first list', () => {
    const rows = [
      row('FINAL', { rank: 4 }),
      row('FINAL', { rank: 1, winner: 'SE' }),
      row('NQ'),
      row('NQ'),
      row('NQ'),
      row('FINAL', { rank: 1, winner: 'SE' }),
      row('FINAL', { rank: 1, winner: 'SE' }),
      row('FINAL', { rank: 12 }),
    ];

    expect(computeEntryStreaks(rows, 'SE')).toEqual({
      currentQualifying: 2,
      longestQualifying: 3,
      longestNonQualifying: 3,
      longestTop10: 2,
      longestWins: 2,
    });
  });

  it('has no current streak when the newest contest was missed', () => {
    const rows = [row('NQ'), row('FINAL', { rank: 3 })];

    expect(computeEntryStreaks(rows, 'SE').currentQualifying).toBe(0);
    expect(computeEntryStreaks(rows, 'SE').longestQualifying).toBe(1);
  });

  it('lets pre-qualified contests neither extend nor break qualifying runs', () => {
    const rows = [
      row('FINAL', { rank: 2, preQualified: true }),
      row('FINAL', { rank: 5 }),
      row('NQ'),
      row('FINAL', { rank: 3, preQualified: true }),
      row('NQ'),
      row('FINAL', { rank: 30 }),
    ];

    expect(computeEntryStreaks(rows, 'SE')).toMatchObject({
      currentQualifying: 1,
      longestQualifying: 1,
      longestNonQualifying: 2,
      longestTop10: 2,
    });
  });

  it('returns zeros for no participations', () => {
    expect(computeEntryStreaks([], 'SE')).toEqual({
      currentQualifying: 0,
      longestQualifying: 0,
      longestNonQualifying: 0,
      longestTop10: 0,
      longestWins: 0,
    });
  });
});

describe('sortContestsNewestFirst', () => {
  it('sorts by year, then creation time, then name', () => {
    const sorted = sortContestsNewestFirst([
      { contestName: 'B', year: 2024, contestCreatedAt: '2026-01-01' },
      { contestName: 'A', year: 2024, contestCreatedAt: '2026-01-01' },
      { contestName: 'C', year: 2025 },
      { contestName: 'D', year: 2024, contestCreatedAt: '2026-05-01' },
      { contestName: 'E' },
    ]);

    expect(sorted.map((r) => r.contestName)).toEqual(['C', 'D', 'A', 'B', 'E']);
  });
});
