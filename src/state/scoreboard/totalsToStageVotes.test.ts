import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BaseCountry,
  PointsItem,
  StageVotingMode,
  VotingCountry,
} from '../../models';

import { RankChannel, totalsForChannels } from './rankToStageVotes';
import {
  channelSingleMax,
  clampChannelTargets,
  computeChannelBudget,
  constructChannelTowardTargets,
  generateVotesForTargets,
} from './totalsToStageVotes';
import { ManualShareTotalsRow, StageVotes, Vote } from './types';

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

const requiredChannels: Record<string, RankChannel[]> = {
  [StageVotingMode.JURY_AND_TELEVOTE]: ['jury', 'televote'],
  [StageVotingMode.COMBINED]: ['jury', 'televote'],
  [StageVotingMode.JURY_ONLY]: ['jury'],
  [StageVotingMode.TELEVOTE_ONLY]: ['televote'],
};

// Build a per-code targets map for a given display field.
const targetsFor = (
  field: 'jury' | 'televote' | 'combined',
  byCode: Record<string, number>,
): Record<string, ManualShareTotalsRow> => {
  const out: Record<string, ManualShareTotalsRow> = {};

  Object.entries(byCode).forEach(([code, value]) => {
    out[code] = { [field]: value };
  });

  return out;
};

describe('totalsToStageVotes', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(makeLcg(42));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('computeChannelBudget', () => {
    it('computes voters, per-voter sum and budget for a full field', () => {
      const b = computeChannelBudget('jury', pointsSystem, votingCountries, 8);

      expect(b.voters).toBe(8);
      expect(b.numAwardable).toBe(5);
      expect(b.perVoterSum).toBe(12 + 10 + 8 + 7 + 6); // 43
      expect(b.budget).toBe(8 * 43); // 344
      expect(b.maxValue).toBe(12);
      expect(channelSingleMax(b)).toBe(8 * 12); // 96
    });

    it('excludes the WW voter from the jury channel only', () => {
      const withWW: VotingCountry[] = [
        ...votingCountries,
        { code: 'WW', name: 'Rest of the World', flag: '' } as VotingCountry,
      ];

      expect(computeChannelBudget('jury', pointsSystem, withWW, 8).voters).toBe(
        8,
      );
      expect(
        computeChannelBudget('televote', pointsSystem, withWW, 8).voters,
      ).toBe(9);
    });

    it('honours per-voter channel overrides', () => {
      const withWW: VotingCountry[] = [
        ...votingCountries,
        { code: 'WW', name: 'Rest of the World', flag: '' } as VotingCountry,
      ];
      // WW votes in both channels; AA is televote-only; BB is jury-only.
      const voterChannels = { WW: 'both', AA: 'televote', BB: 'jury' } as const;

      expect(
        computeChannelBudget('jury', pointsSystem, withWW, 8, voterChannels)
          .voters,
      ).toBe(8);
      expect(
        computeChannelBudget('televote', pointsSystem, withWW, 8, voterChannels)
          .voters,
      ).toBe(8);
    });

    it('shrinks awardable slots when there are fewer rivals than points', () => {
      // 3 participants -> a voter can only award 2 distinct points.
      const b = computeChannelBudget('jury', pointsSystem, votingCountries, 3);

      expect(b.numAwardable).toBe(2);
      expect(b.perVoterSum).toBe(12 + 10);
    });
  });

  describe('clampChannelTargets', () => {
    const budget = computeChannelBudget(
      'jury',
      pointsSystem,
      votingCountries,
      8,
    );

    it('caps a single entry to the single-country max', () => {
      const clamped = clampChannelTargets({ AA: 500 }, budget);

      expect(clamped.AA).toBe(96); // 8 voters * 12
    });

    it('enforces the prefix bound on several top-heavy entries', () => {
      // Three countries all claiming the max can't coexist: only 8 twelves,
      // 8 tens, 8 eights exist across the whole channel.
      const clamped = clampChannelTargets({ AA: 96, BB: 96, CC: 96 }, budget);

      expect(clamped.AA).toBe(96); // 8*12
      expect(clamped.BB).toBe(80); // 8*(12+10) - 96
      expect(clamped.CC).toBe(64); // 8*(12+10+8) - 176
    });

    it('leaves feasible targets untouched', () => {
      const clamped = clampChannelTargets({ AA: 40, BB: 30, CC: 10 }, budget);

      expect(clamped).toEqual({ AA: 40, BB: 30, CC: 10 });
    });
  });

  describe('constructChannelTowardTargets', () => {
    it('apportions each voter to the codes furthest below target', () => {
      const byVoter = constructChannelTowardTargets(
        pointsSystem,
        votingCountries,
        'jury',
        codes,
        { AA: 80, BB: 60, CC: 45, DD: 40, EE: 30, FF: 20, GG: 10, HH: 5 },
      );
      const votes: Partial<StageVotes> = { jury: byVoter };

      assertBallotsValid(votes, 'jury');
      assertChannelSaveReady(votes, 'jury', codes);

      const totals = totalsForChannels(votes, ['jury'], codes);

      // Column sums honour the target ordering...
      expect(totals.AA).toBeGreaterThanOrEqual(totals.BB);
      expect(totals.BB).toBeGreaterThanOrEqual(totals.CC);
      // ...and land close to the targets (largest-remainder is tight).
      expect(Math.abs(totals.AA - 80)).toBeLessThanOrEqual(12);
      expect(Math.abs(totals.CC - 45)).toBeLessThanOrEqual(12);
    });

    it('never awards a voter its own country and uses each point id once', () => {
      const byVoter = constructChannelTowardTargets(
        pointsSystem,
        votingCountries,
        'jury',
        codes,
        Object.fromEntries(codes.map((c, i) => [c, (codes.length - i) * 5])),
      );

      assertBallotsValid({ jury: byVoter }, 'jury');
    });
  });

  describe('generateVotesForTargets', () => {
    it('fits feasible targets closely and keeps the channel budget exact', () => {
      const targets = targetsFor('jury', {
        AA: 80,
        BB: 60,
        CC: 45,
        DD: 40,
        EE: 30,
      });

      const { votes, achieved, adjustments } = generateVotesForTargets({
        targets,
        stageCountries,
        votingCountries,
        votingMode: StageVotingMode.JURY_ONLY,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      assertBallotsValid(votes, 'jury');
      assertChannelSaveReady(votes, 'jury', codes);

      // The whole channel budget is always fully allocated.
      const total = codes.reduce((s, c) => s + (achieved[c] || 0), 0);

      expect(total).toBe(8 * 43); // budget

      // Feasible targets are hit tightly (small residuals only), and the higher
      // targets keep their ordering.
      const totalErr = adjustments.reduce(
        (s, a) => s + Math.abs(a.requested - a.achieved),
        0,
      );

      expect(totalErr).toBeLessThanOrEqual(12);
      expect(achieved.AA).toBeGreaterThanOrEqual(achieved.BB);
      expect(achieved.BB).toBeGreaterThanOrEqual(achieved.CC);
    });

    it('only builds ballots for voters eligible in each channel', () => {
      const withWW: VotingCountry[] = [
        ...votingCountries,
        { code: 'WW', name: 'Rest of the World', flag: '' } as VotingCountry,
      ];
      const voterChannels = { WW: 'both', AA: 'televote', BB: 'jury' } as const;
      const targets = targetsFor('jury', { AA: 80 });

      const { votes } = generateVotesForTargets({
        targets: {
          ...targets,
          AA: { ...targets.AA, televote: 80 },
        } as Record<string, ManualShareTotalsRow>,
        stageCountries,
        votingCountries: withWW,
        voterChannels,
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      expect(Object.keys(votes.jury ?? {}).sort()).toEqual(
        ['BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'WW'].sort(),
      );
      expect(Object.keys(votes.televote ?? {}).sort()).toEqual(
        ['AA', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'WW'].sort(),
      );
      assertBallotsValid(votes, 'jury');
      assertBallotsValid(votes, 'televote');
    });

    it('clamps and reports adjustments for over-concentrated targets', () => {
      // Three countries all pinned at the single-country max — impossible.
      const targets = targetsFor('jury', { AA: 96, BB: 96, CC: 96 });

      const { achieved, adjustments } = generateVotesForTargets({
        targets,
        stageCountries,
        votingCountries,
        votingMode: StageVotingMode.JURY_ONLY,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      // At least the 2nd and 3rd of the three max claims must be adjusted down.
      const adjustedCodes = adjustments.map((a) => a.code);

      expect(adjustedCodes).toContain('BB');
      expect(adjustedCodes).toContain('CC');
      adjustments.forEach((a) => {
        expect(a.achieved).toBeLessThan(a.requested);
      });
      // The three max claims can't jointly exceed the prefix bound: only 8
      // twelves, 8 tens and 8 eights exist across the channel.
      expect(achieved.AA + achieved.BB + achieved.CC).toBeLessThanOrEqual(240);
    });

    it('treats a pinned 0 differently from a blank field', () => {
      const run = (targets: Record<string, ManualShareTotalsRow>) =>
        generateVotesForTargets({
          targets,
          stageCountries,
          votingCountries,
          votingMode: StageVotingMode.JURY_ONLY,
          juryPointsSystem: pointsSystem,
          televotePointsSystem: pointsSystem,
          randomnessLevel: 20,
          pointsSpread: 60,
        });

      // Explicit 0 is a real target: AA is held at nul points.
      const pinnedZero = run({ AA: { jury: 0 }, BB: { jury: 100 } });

      expect(pinnedZero.achieved.AA).toBe(0);

      // Blank means "let the engine decide": AA shares the leftover budget.
      const blank = run({ BB: { jury: 100 } });

      expect(blank.achieved.AA).toBeGreaterThan(0);
    });

    it('needs no clamping when only a few countries are pinned modestly', () => {
      // The "count" case: lots of blanks absorb the leftover budget.
      const targets = targetsFor('jury', { AA: 60, BB: 40 });

      const { adjustments } = generateVotesForTargets({
        targets,
        stageCountries,
        votingCountries,
        votingMode: StageVotingMode.JURY_ONLY,
        juryPointsSystem: pointsSystem,
        televotePointsSystem: pointsSystem,
        randomnessLevel: 20,
        pointsSpread: 60,
      });

      // Any residual is a small fit remainder, not a feasibility clamp.
      adjustments.forEach((a) => {
        expect(Math.abs(a.requested - a.achieved)).toBeLessThanOrEqual(12);
      });
    });
  });

  describe('save-readiness across voting modes', () => {
    const modes = [
      StageVotingMode.JURY_AND_TELEVOTE,
      StageVotingMode.COMBINED,
      StageVotingMode.JURY_ONLY,
      StageVotingMode.TELEVOTE_ONLY,
    ];

    const fieldForMode = (
      mode: StageVotingMode,
    ): 'jury' | 'televote' | 'combined' =>
      mode === StageVotingMode.COMBINED
        ? 'combined'
        : mode === StageVotingMode.TELEVOTE_ONLY
        ? 'televote'
        : 'jury';

    modes.forEach((votingMode) => {
      it(`fills every required channel completely for ${votingMode}`, () => {
        const byCode: Record<string, number> = {};

        codes.forEach((code, i) => {
          byCode[code] = (codes.length - i) * 5;
        });

        const baseTargets = targetsFor(fieldForMode(votingMode), byCode);
        // JURY_AND_TELEVOTE needs both fields pinned.
        const targets =
          votingMode === StageVotingMode.JURY_AND_TELEVOTE
            ? codes.reduce((acc, code, i) => {
                acc[code] = {
                  jury: (codes.length - i) * 3,
                  televote: (codes.length - i) * 2,
                };

                return acc;
              }, {} as Record<string, ManualShareTotalsRow>)
            : baseTargets;

        const { votes } = generateVotesForTargets({
          targets,
          stageCountries,
          votingCountries,
          votingMode,
          juryPointsSystem: pointsSystem,
          televotePointsSystem: pointsSystem,
          randomnessLevel: 20,
          pointsSpread: 60,
        });

        requiredChannels[votingMode].forEach((channel) => {
          assertChannelSaveReady(votes, channel, codes);
          assertBallotsValid(votes, channel);
        });

        if (votingMode === StageVotingMode.COMBINED) {
          expect((votes as any).combined).toBeDefined();
        }
      });
    });
  });
});
