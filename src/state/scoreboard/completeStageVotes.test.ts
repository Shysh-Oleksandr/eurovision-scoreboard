import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BaseCountry,
  PointsItem,
  StageVotingMode,
  VotingCountry,
} from '../../models';

import { StageVotes, Vote } from './types';
import { completeStageVotes, predefineStageVotes } from './votesPredefinition';

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
];

const codes = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF'];
const stageCountries = codes.map(
  (code) => ({ code, name: code } as BaseCountry),
);
const votingCountries = codes.map(
  (code) => ({ code, name: code, flag: '' } as VotingCountry),
);

const base = {
  stageCountries,
  votingCountries,
  countryOdds: {},
  randomnessLevel: 50,
  pointsSpread: 50,
  juryPointsSystem: pointsSystem,
  televotePointsSystem: pointsSystem,
};

const vote = (countryCode: string, pointsId: number): Vote => ({
  countryCode,
  points: pointsSystem.find((p) => p.id === pointsId)!.value,
  pointsId,
  showDouzePointsAnimation: pointsId === 0,
});

const assertComplete = (
  byVoter: Record<string, Vote[]> | undefined,
  voters: string[],
) => {
  voters.forEach((voter) => {
    const ballot = byVoter?.[voter] ?? [];
    const ids = ballot.map((v) => v.pointsId).sort();

    expect(ids).toEqual([0, 1, 2, 3]);
    expect(ballot.some((v) => v.countryCode === voter)).toBe(false);
    expect(new Set(ballot.map((v) => v.countryCode)).size).toBe(ballot.length);
  });
};

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(makeLcg(7));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('completeStageVotes', () => {
  it('fills every voter of an empty channel', () => {
    const result = completeStageVotes({
      ...base,
      votes: null,
      channels: ['jury'],
      votingMode: StageVotingMode.JURY_ONLY,
    });

    assertComplete(result.jury, codes);
    expect(result.televote).toBeUndefined();
  });

  it('keeps the points already given and fills around them', () => {
    const partial: Partial<StageVotes> = {
      jury: { AA: [vote('BB', 0), vote('CC', 3)] },
    };
    const result = completeStageVotes({
      ...base,
      votes: partial,
      channels: ['jury'],
      votingMode: StageVotingMode.JURY_ONLY,
    });

    assertComplete(result.jury, codes);
    expect(result.jury!.AA).toEqual(
      expect.arrayContaining([vote('BB', 0), vote('CC', 3)]),
    );
    // The input isn't mutated.
    expect(partial.jury!.AA).toHaveLength(2);
  });

  it('leaves complete ballots and other channels alone', () => {
    const complete = [
      vote('BB', 0),
      vote('CC', 1),
      vote('DD', 2),
      vote('EE', 3),
    ];
    const televote = { AA: [vote('FF', 0)] };
    const result = completeStageVotes({
      ...base,
      votes: { jury: { AA: complete }, televote },
      channels: ['jury'],
      votingMode: StageVotingMode.JURY_AND_TELEVOTE,
    });

    expect(result.jury!.AA).toBe(complete);
    expect(result.televote).toBe(televote);
  });

  it('only fills the voters asked for', () => {
    const result = completeStageVotes({
      ...base,
      votes: null,
      channels: ['televote'],
      voterCodes: ['BB'],
      votingMode: StageVotingMode.TELEVOTE_ONLY,
    });

    expect(Object.keys(result.televote!)).toEqual(['BB']);
    assertComplete(result.televote, ['BB']);
  });

  it('drops what a ballot can’t keep (a slot twice, a self-vote)', () => {
    const result = completeStageVotes({
      ...base,
      votes: { jury: { AA: [vote('AA', 0), vote('BB', 1), vote('CC', 1)] } },
      channels: ['jury'],
      votingMode: StageVotingMode.JURY_ONLY,
    });

    assertComplete(result.jury, ['AA']);
    expect(result.jury!.AA).toContainEqual(vote('BB', 1));
  });

  it('skips channels the voting mode doesn’t use', () => {
    const result = completeStageVotes({
      ...base,
      votes: null,
      channels: ['jury', 'televote'],
      votingMode: StageVotingMode.TELEVOTE_ONLY,
    });

    expect(result.jury).toBeUndefined();
    assertComplete(result.televote, codes);
  });

  it('gives several slots to one entry when that is allowed', () => {
    const result = completeStageVotes({
      ...base,
      votes: { jury: { AA: [vote('BB', 0)] } },
      channels: ['jury'],
      voterCodes: ['AA'],
      votingMode: StageVotingMode.JURY_ONLY,
      allowMultiplePointsToSameEntry: true,
    });
    const ids = result.jury!.AA.map((v) => v.pointsId).sort();

    expect(ids).toEqual([0, 1, 2, 3]);
    expect(result.jury!.AA.some((v) => v.countryCode === 'AA')).toBe(false);
  });

  it('rebuilds incomplete combined ballots for combined voting', () => {
    const generated = predefineStageVotes(
      stageCountries,
      votingCountries,
      StageVotingMode.COMBINED,
      {},
      50,
      50,
      pointsSystem,
      pointsSystem,
    );
    const combinedWithoutAA = { ...generated.combined! };

    delete combinedWithoutAA.AA;
    const result = completeStageVotes({
      ...base,
      votes: { ...generated, combined: combinedWithoutAA },
      channels: ['jury', 'televote'],
      completeCombined: true,
      votingMode: StageVotingMode.COMBINED,
    });

    assertComplete(result.combined, codes);
    expect(result.combined!.BB).toBe(generated.combined!.BB);
  });
});
