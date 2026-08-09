import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BaseCountry,
  Country,
  EventStage,
  PointsItem,
  StageId,
  StageVotingMode,
  VotingCountry,
} from '../../models';

import {
  getDouzeAwards,
  getDouzePointsIds,
  getJuryMatrix,
  getScaleSteps,
  getStepAwards,
  hasScaleStepsLeft,
  isJuryScaleRevealActive,
  resolveJuryScaleRevealCursor,
  type JuryVoteMatrix,
} from './juryScaleReveal';
import { JuryScaleReveal, StageVotes, Vote } from './types';
import { predefineStageVotes } from './votesPredefinition';

// Deterministic LCG so `predefineStageVotes` (which uses Math.random) is
// reproducible across runs.
const makeLcg = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 0xffffffff;
  };
};

const POINTS_12: PointsItem = { value: 12, id: 0, showDouzePoints: true };
const POINTS_2: PointsItem = { value: 2, id: 8, showDouzePoints: false };
const POINTS_1: PointsItem = { value: 1, id: 9, showDouzePoints: false };

const ESC_POINTS_SYSTEM: PointsItem[] = [
  POINTS_12,
  { value: 10, id: 1, showDouzePoints: false },
  { value: 8, id: 2, showDouzePoints: false },
  { value: 7, id: 3, showDouzePoints: false },
  { value: 6, id: 4, showDouzePoints: false },
  { value: 5, id: 5, showDouzePoints: false },
  { value: 4, id: 6, showDouzePoints: false },
  { value: 3, id: 7, showDouzePoints: false },
  POINTS_2,
  POINTS_1,
];

const codes = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ'];

const voters: VotingCountry[] = codes.map((code) => ({
  code,
  name: code,
  flag: '',
}));

const vote = (countryCode: string, pointsItem: PointsItem): Vote => ({
  countryCode,
  points: pointsItem.value,
  pointsId: pointsItem.id,
  showDouzePointsAnimation: pointsItem.showDouzePoints,
});

const makeStage = (overrides: Partial<EventStage> = {}): EventStage => ({
  id: StageId.GF,
  name: 'Grand Final',
  order: 0,
  votingMode: StageVotingMode.JURY_ONLY,
  countries: codes.map(
    (code) =>
      ({
        code,
        name: code,
        juryPoints: 0,
        televotePoints: 0,
        points: 0,
        lastReceivedPoints: null,
      } as Country),
  ),
  isOver: false,
  isJuryVoting: true,
  ...overrides,
});

describe('getScaleSteps / getDouzeItems', () => {
  it('lists the non-douze points lowest first', () => {
    expect(getScaleSteps(ESC_POINTS_SYSTEM).map((p) => p.value)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 10,
    ]);
  });

  it('keeps duplicate values as separate steps, ordered by id', () => {
    const system: PointsItem[] = [
      { value: 12, id: 0, showDouzePoints: true },
      { value: 5, id: 1, showDouzePoints: false },
      { value: 5, id: 2, showDouzePoints: false },
      { value: 1, id: 3, showDouzePoints: false },
    ];

    expect(getScaleSteps(system).map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('does not mutate the points system it is given', () => {
    const system = [...ESC_POINTS_SYSTEM];

    getScaleSteps(system);

    expect(system).toEqual(ESC_POINTS_SYSTEM);
  });

  it('treats every flagged item as douze, not just the highest value', () => {
    const system: PointsItem[] = [
      { value: 12, id: 0, showDouzePoints: true },
      { value: 10, id: 1, showDouzePoints: true },
      { value: 8, id: 2, showDouzePoints: false },
    ];

    expect([...getDouzePointsIds(system)]).toEqual([0, 1]);
    expect(getScaleSteps(system).map((p) => p.id)).toEqual([2]);
  });

  it('handles a points system with no douze tier', () => {
    const system: PointsItem[] = [
      { value: 2, id: 0, showDouzePoints: false },
      { value: 1, id: 1, showDouzePoints: false },
    ];

    expect(getDouzePointsIds(system).size).toBe(0);
    expect(getScaleSteps(system)).toHaveLength(2);
  });

  it('handles a points system that is entirely douze', () => {
    const system: PointsItem[] = [{ value: 12, id: 0, showDouzePoints: true }];

    expect(getScaleSteps(system)).toHaveLength(0);
    expect(getDouzePointsIds(system).size).toBe(1);
  });
});

describe('getStepAwards', () => {
  const one = POINTS_1;
  const two = POINTS_2;

  it('groups every jury awarding the same points value', () => {
    const matrix: JuryVoteMatrix = {
      AA: [vote('CC', one)],
      BB: [vote('CC', one)],
      CC: [vote('DD', one)],
    };

    const awards = getStepAwards(matrix, one.id, voters);

    expect(awards.CC).toEqual({ points: 2, voterCodes: ['AA', 'BB'] });
    expect(awards.DD).toEqual({ points: 1, voterCodes: ['CC'] });
  });

  it('sums when one voter awards the same item twice (duplicates allowed)', () => {
    const matrix: JuryVoteMatrix = { AA: [vote('CC', one), vote('CC', one)] };

    expect(getStepAwards(matrix, one.id, voters).CC).toEqual({
      points: 2,
      voterCodes: ['AA'],
    });
  });

  it('ignores other points values and missing voters', () => {
    const matrix: JuryVoteMatrix = {
      AA: [vote('CC', two)],
      ZZ: [vote('CC', one)], // not in the voter list
    };

    expect(getStepAwards(matrix, one.id, voters)).toEqual({});
  });

  it('orders voter flags by spokesperson order, not matrix key order', () => {
    const matrix: JuryVoteMatrix = {
      CC: [vote('AA', one)],
      BB: [vote('AA', one)],
    };

    expect(getStepAwards(matrix, one.id, voters).AA.voterCodes).toEqual([
      'BB',
      'CC',
    ]);
  });

  it('returns nothing without a matrix', () => {
    expect(getStepAwards(null, one.id, voters)).toEqual({});
  });
});

describe('getDouzeAwards', () => {
  const douze = POINTS_12;
  const douzeIds = getDouzePointsIds(ESC_POINTS_SYSTEM);

  const matrix: JuryVoteMatrix = {
    AA: [vote('CC', douze)],
    BB: [vote('CC', douze)],
    CC: [vote('DD', douze)],
  };

  it('accumulates across the voters revealed so far', () => {
    const { totals } = getDouzeAwards(matrix, douzeIds, voters, 0, 3);

    expect(totals).toEqual({ CC: 24, DD: 12 });
  });

  it('reports only the latest voter, so a single flag is shown', () => {
    const { lastVoterCode, lastRecipientCodes } = getDouzeAwards(
      matrix,
      douzeIds,
      voters,
      0,
      2,
    );

    expect(lastVoterCode).toBe('BB');
    expect(lastRecipientCodes).toEqual(['CC']);
  });

  it('awards a single voter when used as the apply-one-step slice', () => {
    const { totals } = getDouzeAwards(matrix, douzeIds, voters, 1, 2);

    expect(totals).toEqual({ CC: 12 });
  });

  it('skips voters that awarded nothing when picking the latest flag', () => {
    const sparse: JuryVoteMatrix = { AA: [vote('CC', douze)], BB: [] };

    expect(getDouzeAwards(sparse, douzeIds, voters, 0, 2).lastVoterCode).toBe(
      'AA',
    );
  });

  it('clamps out-of-range slices', () => {
    expect(getDouzeAwards(matrix, douzeIds, voters, -5, 999).totals).toEqual({
      CC: 24,
      DD: 12,
    });
  });

  it('returns nothing when the points system has no douze tier', () => {
    expect(getDouzeAwards(matrix, new Set(), voters, 0, 3).totals).toEqual({});
  });
});

describe('getJuryMatrix', () => {
  const predefined: Record<string, Partial<StageVotes>> = {
    [StageId.GF]: {
      jury: { AA: [] },
      combined: { BB: [] },
    },
  };

  it('reads the combined channel for COMBINED stages', () => {
    const stage = makeStage({ votingMode: StageVotingMode.COMBINED });

    expect(getJuryMatrix(stage, predefined)).toEqual({ BB: [] });
  });

  it('reads the jury channel otherwise', () => {
    const stage = makeStage({ votingMode: StageVotingMode.JURY_AND_TELEVOTE });

    expect(getJuryMatrix(stage, predefined)).toEqual({ AA: [] });
  });

  it('returns null when the stage has no votes yet', () => {
    expect(getJuryMatrix(makeStage(), {})).toBeNull();
  });
});

describe('resolveJuryScaleRevealCursor / hasScaleStepsLeft', () => {
  const withJuryPoints = (): EventStage => {
    const stage = makeStage();

    stage.countries[0].juryPoints = 12;

    return stage;
  };

  it('starts a fresh countdown for a stage it has not taken over', () => {
    const stale: JuryScaleReveal = {
      stageId: StageId.SF1,
      phase: 'done',
      stepIndex: 9,
    };

    expect(resolveJuryScaleRevealCursor(stale, makeStage())).toEqual({
      stageId: StageId.GF,
      phase: 'scale',
      stepIndex: 0,
    });
  });

  it('keeps the stored cursor for the stage it belongs to', () => {
    const cursor: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'douze',
      stepIndex: 9,
    };

    expect(resolveJuryScaleRevealCursor(cursor, withJuryPoints())).toBe(cursor);
  });

  /*
   * Regression: the cursor is persisted and stage ids repeat across contests, so
   * replaying a saved contest used to inherit the previous run's finished cursor,
   * skip the whole countdown and award only the 12 points.
   */
  it('discards a cursor claiming progress against an untouched board', () => {
    const stale: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'done',
      stepIndex: 9,
    };

    expect(resolveJuryScaleRevealCursor(stale, makeStage())).toEqual({
      stageId: StageId.GF,
      phase: 'scale',
      stepIndex: 0,
    });
  });

  it('discards a half-finished countdown against an untouched board', () => {
    const stale: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'scale',
      stepIndex: 4,
    };

    expect(resolveJuryScaleRevealCursor(stale, makeStage()).stepIndex).toBe(0);
  });

  it('keeps a cursor that has not revealed anything yet', () => {
    const cursor: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'scale',
      stepIndex: 0,
    };

    expect(resolveJuryScaleRevealCursor(cursor, makeStage())).toBe(cursor);
  });

  it('stays in the scale phase until the last step has been revealed', () => {
    const cursor = (stepIndex: number): JuryScaleReveal => ({
      stageId: StageId.GF,
      phase: 'scale',
      stepIndex,
    });

    expect(hasScaleStepsLeft(cursor(8), 9)).toBe(true);
    // Cursor parked past the last step: the overlay stays up, spokespersons next.
    expect(hasScaleStepsLeft(cursor(9), 9)).toBe(false);
    // An all-douze points system goes straight to the spokespersons.
    expect(hasScaleStepsLeft(cursor(0), 0)).toBe(false);
  });

  it('has no steps left on the finish beat', () => {
    expect(
      hasScaleStepsLeft(
        { stageId: StageId.GF, phase: 'awaitingFinish', stepIndex: 0 },
        9,
      ),
    ).toBe(false);
  });
});

describe('isJuryScaleRevealActive', () => {
  const baseParams = {
    enableJuryScaleReveal: true,
    isPickQualifiersMode: false,
    juryScaleReveal: null as JuryScaleReveal | null,
    votingCountryIndex: 0,
    votingPointsIndex: 0,
    viewedStageId: null as string | null,
    showAllParticipants: false,
  };

  const takenOver: JuryScaleReveal = {
    stageId: StageId.GF,
    phase: 'scale',
    stepIndex: 3,
  };

  it('is on for a fresh jury phase', () => {
    expect(isJuryScaleRevealActive({ ...baseParams, stage: makeStage() })).toBe(
      true,
    );
  });

  it('is off when the setting is off', () => {
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        enableJuryScaleReveal: false,
        stage: makeStage(),
      }),
    ).toBe(false);
  });

  it('is off for televote-only stages', () => {
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        stage: makeStage({ votingMode: StageVotingMode.TELEVOTE_ONLY }),
      }),
    ).toBe(false);
  });

  it('is off for pick-qualifiers semi-finals but on for the grand final', () => {
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        isPickQualifiersMode: true,
        stage: makeStage({ id: StageId.SF1 }),
      }),
    ).toBe(false);
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        isPickQualifiersMode: true,
        stage: makeStage(),
      }),
    ).toBe(true);
  });

  it('refuses to take over a jury vote the normal flow already started', () => {
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        votingCountryIndex: 2,
        stage: makeStage(),
      }),
    ).toBe(false);

    const stageWithPoints = makeStage();

    stageWithPoints.countries[0].juryPoints = 12;

    expect(
      isJuryScaleRevealActive({ ...baseParams, stage: stageWithPoints }),
    ).toBe(false);
  });

  it('stays on for a stage it already owns, even once points are on the board', () => {
    const stageWithPoints = makeStage();

    stageWithPoints.countries[0].juryPoints = 12;

    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        juryScaleReveal: takenOver,
        votingCountryIndex: 4,
        stage: stageWithPoints,
      }),
    ).toBe(true);
  });

  it('stays on through the finish beat, before the stage is committed', () => {
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        juryScaleReveal: {
          stageId: StageId.GF,
          phase: 'awaitingFinish',
          stepIndex: 9,
        },
        votingCountryIndex: 35,
        stage: makeStage({ votingMode: StageVotingMode.JURY_AND_TELEVOTE }),
      }),
    ).toBe(true);
  });

  it('keeps the bars up after a jury-terminal stage it revealed ends', () => {
    const finished = makeStage({ isJuryVoting: false, isOver: true });
    const doneCursor: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'done',
      stepIndex: 9,
    };

    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        juryScaleReveal: doneCursor,
        stage: finished,
      }),
    ).toBe(true);
  });

  it('does not come back after televote finishes a JURY_AND_TELEVOTE stage', () => {
    const finished = makeStage({
      votingMode: StageVotingMode.JURY_AND_TELEVOTE,
      isJuryVoting: false,
      isOver: true,
    });
    const doneCursor: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'done',
      stepIndex: 9,
    };

    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        juryScaleReveal: doneCursor,
        stage: finished,
      }),
    ).toBe(false);
  });

  it('falls back to the normal board for the cross-stage result views', () => {
    const finished = makeStage({ isJuryVoting: false, isOver: true });
    const doneCursor: JuryScaleReveal = {
      stageId: StageId.GF,
      phase: 'done',
      stepIndex: 9,
    };

    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        juryScaleReveal: doneCursor,
        showAllParticipants: true,
        stage: finished,
      }),
    ).toBe(false);
    expect(
      isJuryScaleRevealActive({
        ...baseParams,
        juryScaleReveal: doneCursor,
        viewedStageId: StageId.SF1,
        stage: finished,
      }),
    ).toBe(false);
  });
});

/*
 * The invariant that makes the whole feature safe: replaying the reveal must
 * land on exactly the totals the default flow would produce, because both read
 * the same predefined matrix.
 */
describe('full replay matches the vote matrix totals', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const lcg = makeLcg(20241124);

    randomSpy = vi.spyOn(Math, 'random').mockImplementation(lcg);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  const sumMatrix = (matrix: JuryVoteMatrix): Record<string, number> => {
    const totals: Record<string, number> = {};

    voters.forEach((voter) => {
      (matrix[voter.code] ?? []).forEach((v) => {
        totals[v.countryCode] = (totals[v.countryCode] ?? 0) + v.points;
      });
    });

    return totals;
  };

  const replay = (
    matrix: JuryVoteMatrix,
    pointsSystem: PointsItem[],
  ): Record<string, number> => {
    const totals: Record<string, number> = {};
    const add = (countryCode: string, points: number) => {
      totals[countryCode] = (totals[countryCode] ?? 0) + points;
    };

    getScaleSteps(pointsSystem).forEach((step) => {
      Object.entries(getStepAwards(matrix, step.id, voters)).forEach(
        ([countryCode, award]) => add(countryCode, award.points),
      );
    });

    const douzeIds = getDouzePointsIds(pointsSystem);

    for (let index = 0; index < voters.length; index += 1) {
      const { totals: awarded } = getDouzeAwards(
        matrix,
        douzeIds,
        voters,
        index,
        index + 1,
      );

      Object.entries(awarded).forEach(([countryCode, points]) =>
        add(countryCode, points),
      );
    }

    return totals;
  };

  const generateMatrix = (
    pointsSystem: PointsItem[],
    allowMultiplePointsToSameEntry = false,
  ): JuryVoteMatrix => {
    const stageCountries: BaseCountry[] = codes.map(
      (code) =>
        ({ code, name: code, juryOdds: 50, televoteOdds: 50 } as BaseCountry),
    );

    const votes = predefineStageVotes(
      stageCountries,
      voters,
      StageVotingMode.JURY_ONLY,
      {},
      50,
      50,
      pointsSystem,
      pointsSystem,
      allowMultiplePointsToSameEntry,
    );

    return votes.jury as JuryVoteMatrix;
  };

  it('matches for the standard points system', () => {
    const matrix = generateMatrix(ESC_POINTS_SYSTEM);

    expect(replay(matrix, ESC_POINTS_SYSTEM)).toEqual(sumMatrix(matrix));
  });

  it('matches when duplicates to the same entry are allowed', () => {
    const matrix = generateMatrix(ESC_POINTS_SYSTEM, true);

    expect(replay(matrix, ESC_POINTS_SYSTEM)).toEqual(sumMatrix(matrix));
  });

  it('matches with several douze-tier items', () => {
    const system: PointsItem[] = [
      { value: 12, id: 0, showDouzePoints: true },
      { value: 12, id: 1, showDouzePoints: true },
      { value: 8, id: 2, showDouzePoints: false },
      { value: 4, id: 3, showDouzePoints: false },
      { value: 1, id: 4, showDouzePoints: false },
    ];
    const matrix = generateMatrix(system);

    expect(replay(matrix, system)).toEqual(sumMatrix(matrix));
  });

  it('matches with no douze tier at all', () => {
    const system: PointsItem[] = [
      { value: 5, id: 0, showDouzePoints: false },
      { value: 3, id: 1, showDouzePoints: false },
      { value: 1, id: 2, showDouzePoints: false },
    ];
    const matrix = generateMatrix(system);

    expect(replay(matrix, system)).toEqual(sumMatrix(matrix));
  });
});
