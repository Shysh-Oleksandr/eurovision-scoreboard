import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BaseCountry,
  PointsItem,
  StageVotingMode,
  VotingCountry,
} from '../../models';

import {
  generateRankConsistentVotes,
  RankChannel,
  repairMonotonicTotals,
  totalsForChannels,
} from './rankToStageVotes';
import { StageVotes, Vote } from './types';

// Deterministic LCG so `predefineStageVotes` (which uses Math.random) is
// reproducible across runs.
const makeLcg = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 0xffffffff;
  };
};

const pointsSystem: PointsItem[] = [
  { value: 12, id: 0, showDouzePoints: true },
  { value: 10, id: 1, showDouzePoints: false },
  { value: 8, id: 2, showDouzePoints: false },
  { value: 7, id: 3, showDouzePoints: false },
  { value: 6, id: 4, showDouzePoints: false },
];

const codes = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH'];

const stageCountries: BaseCountry[] = codes.map(
  (code) => ({ code, name: code } as BaseCountry),
);
const votingCountries: VotingCountry[] = codes.map(
  (code) => ({ code, name: code, flag: '' } as VotingCountry),
);

const assertNonIncreasing = (
  totals: Record<string, number>,
  order: string[],
) => {
  for (let i = 0; i < order.length - 1; i += 1) {
    expect(totals[order[i]]).toBeGreaterThanOrEqual(totals[order[i + 1]]);
  }
};

const assertBallotsValid = (
  votes: Partial<StageVotes>,
  channel: RankChannel,
) => {
  const byVoter = (votes as any)[channel] as Record<string, Vote[]>;

  Object.entries(byVoter).forEach(([voter, ballot]) => {
    // No self-votes.
    expect(ballot.some((v) => v.countryCode === voter)).toBe(false);
    // Each point id used exactly once.
    const ids = ballot.map((v) => v.pointsId);

    expect(new Set(ids).size).toBe(ids.length);
    // Distinct recipients.
    const recipients = ballot.map((v) => v.countryCode);

    expect(new Set(recipients).size).toBe(recipients.length);
  });
};

// Mirror of `validateAllBeforeSave`: every voter must use every point id once.
const assertChannelSaveReady = (
  votes: Partial<StageVotes>,
  channel: RankChannel,
  voters: string[],
) => {
  const byVoter = (votes as any)[channel] as Record<string, Vote[]>;

  expect(byVoter).toBeDefined();
  const expectedIds = pointsSystem.map((p) => p.id).sort();

  voters.forEach((voter) => {
    const ballot = byVoter[voter] || [];
    const usedIds = ballot.map((v) => v.pointsId).sort();

    expect(usedIds).toEqual(expectedIds);
  });
};

// The channels save-validation requires for each voting mode.
const requiredChannels: Record<string, RankChannel[]> = {
  [StageVotingMode.JURY_AND_TELEVOTE]: ['jury', 'televote'],
  [StageVotingMode.COMBINED]: ['jury', 'televote'],
  [StageVotingMode.JURY_ONLY]: ['jury'],
  [StageVotingMode.TELEVOTE_ONLY]: ['televote'],
};

describe('rankToStageVotes', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(makeLcg(42));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateRankConsistentVotes', () => {
    it('produces non-increasing jury totals along the drag order', () => {
      const order = [...codes];
      const { votes, totals, rankChannels } = generateRankConsistentVotes({
        orderedCodes: order,
        stageCountries,
        votingCountries,
        target: 'jury',
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      expect(rankChannels).toEqual(['jury']);
      assertNonIncreasing(totals, order);
      assertBallotsValid(votes, 'jury');
      // Returned totals match a fresh recompute.
      expect(totals).toEqual(totalsForChannels(votes, rankChannels, order));
    });

    it('respects a reversed drag order (order is honoured, not odds)', () => {
      const order = [...codes].reverse();
      const { totals } = generateRankConsistentVotes({
        orderedCodes: order,
        stageCountries,
        votingCountries,
        target: 'jury',
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      assertNonIncreasing(totals, order);
    });

    it('generates both channels for a Total ranking and keeps the combined total consistent', () => {
      const order = [...codes];
      const { votes, totals, rankChannels } = generateRankConsistentVotes({
        orderedCodes: order,
        stageCountries,
        votingCountries,
        target: 'total',
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      expect(rankChannels).toEqual(['jury', 'televote']);
      assertNonIncreasing(totals, order);
      assertBallotsValid(votes, 'jury');
      assertBallotsValid(votes, 'televote');
    });
  });

  describe('save-readiness across voting modes (Total ranking)', () => {
    const modes = [
      StageVotingMode.JURY_AND_TELEVOTE,
      StageVotingMode.COMBINED,
      StageVotingMode.JURY_ONLY,
      StageVotingMode.TELEVOTE_ONLY,
    ];

    modes.forEach((votingMode) => {
      it(`fills every required channel completely for ${votingMode}`, () => {
        const order = [...codes];
        const { votes, totals } = generateRankConsistentVotes({
          orderedCodes: order,
          stageCountries,
          votingCountries,
          target: 'total',
          votingMode,
          juryPointsSystem: pointsSystem,
          televotePointsSystem: pointsSystem,
          randomnessLevel: 20,
          pointsSpread: 60,
        });

        // Standings honour the drag order.
        assertNonIncreasing(totals, order);

        // Every channel save-validation checks is present and complete per voter.
        requiredChannels[votingMode].forEach((channel) => {
          assertChannelSaveReady(
            votes,
            channel,
            codes.filter((c) => c !== 'WW'),
          );
          assertBallotsValid(votes, channel);
        });

        // COMBINED additionally drives standings from the `combined` channel.
        if (votingMode === StageVotingMode.COMBINED) {
          expect((votes as any).combined).toBeDefined();
        }
      });
    });
  });

  describe('repairMonotonicTotals', () => {
    it('fixes an adjacent inversion using a third-party voter', () => {
      // Order says AA should out-total BB, but the votes give BB more (CC's
      // ballot favours BB). CC is neither AA nor BB, so a recipient swap fixes it.
      const votes: Partial<StageVotes> = {
        jury: {
          AA: [{ countryCode: 'BB', points: 12, pointsId: 0 } as Vote],
          BB: [{ countryCode: 'AA', points: 12, pointsId: 0 } as Vote],
          CC: [
            { countryCode: 'BB', points: 12, pointsId: 0 } as Vote,
            { countryCode: 'AA', points: 10, pointsId: 1 } as Vote,
          ],
        },
      };
      const order = ['AA', 'BB', 'CC'];
      const voters: VotingCountry[] = order.map(
        (code) => ({ code, name: code, flag: '' } as VotingCountry),
      );

      // Before: AA = 12 (from BB) + 10 (from CC) = 22; BB = 12 (from AA) + 12 (from CC) = 24.
      expect(totalsForChannels(votes, ['jury'], order).AA).toBe(22);
      expect(totalsForChannels(votes, ['jury'], order).BB).toBe(24);

      const totals = repairMonotonicTotals(votes, ['jury'], order, voters);

      assertNonIncreasing(totals, order);
      // Swap happened inside CC only (AA/BB never vote for themselves).
      expect(votes.jury!.AA).toEqual([
        { countryCode: 'BB', points: 12, pointsId: 0 },
      ]);
      expect(votes.jury!.BB).toEqual([
        { countryCode: 'AA', points: 12, pointsId: 0 },
      ]);
      // CC's recipients were swapped (BB<->AA) to lift AA above BB.
      expect(votes.jury!.CC).toEqual([
        { countryCode: 'AA', points: 12, pointsId: 0 },
        { countryCode: 'BB', points: 10, pointsId: 1 },
      ]);
      expect(totals.AA).toBe(24);
      expect(totals.BB).toBe(22);
    });
  });
});
