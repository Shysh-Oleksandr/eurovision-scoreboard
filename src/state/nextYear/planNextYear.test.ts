import { describe, expect, it } from 'vitest';

import {
  followingYear,
  hostLeavesFinalByDefault,
  NextYearInput,
  planNextYear,
} from './planNextYear';

import { CountryAssignmentGroup, EventStage, StageVotingMode } from '@/models';
import { createOfficialRules } from '@/state/allocationDraw/types';

const { TO_BE_DRAWN, NOT_PARTICIPATING, NOT_QUALIFIED } =
  CountryAssignmentGroup;

const stage = (
  id: string,
  order: number,
  qualifiesTo: Record<string, number> = {},
): EventStage => ({
  id,
  name: id,
  order,
  votingMode: StageVotingMode.JURY_AND_TELEVOTE,
  countries: [],
  isOver: false,
  isJuryVoting: false,
  qualifiesTo: Object.entries(qualifiesTo).map(([targetStageId, amount]) => ({
    targetStageId,
    amount,
  })),
});

const TWO_SEMIS = [
  stage('SF1', 0, { GF: 10 }),
  stage('SF2', 1, { GF: 10 }),
  stage('GF', 2),
];
const ONE_SEMI = [stage('SF1', 0, { GF: 10 }), stage('GF', 1)];

// 2026-like: Austria hosted, the Big Four pre-qualified, Norway won SF1.
const ASSIGNMENTS = {
  AT: 'GF',
  FR: 'GF',
  DE: 'GF',
  GB: 'GF',
  NO: 'SF1',
  SE: 'SF1',
  FI: 'SF2',
  UA: 'SF2',
  PL: 'SF2',
  RU: NOT_PARTICIPATING,
};

const input = (patch: Partial<NextYearInput> = {}): NextYearInput => ({
  stages: TWO_SEMIS,
  assignments: ASSIGNMENTS,
  isGfOnly: false,
  drawRules: createOfficialRules(),
  winnerCode: 'NO',
  previousHostCode: 'AT',
  previousHostLeavesFinal: true,
  ...patch,
});

describe('planNextYear', () => {
  it('pre-qualifies the winner and sends the rest of the semis to the draw', () => {
    const plan = planNextYear(input());

    expect(plan.usesDraw).toBe(true);
    expect(plan.preQualified).toEqual([{ code: 'NO', as: 'winner' }]);
    expect(plan.assignments).toEqual({
      AT: TO_BE_DRAWN,
      FR: 'GF',
      DE: 'GF',
      GB: 'GF',
      NO: 'GF',
      SE: TO_BE_DRAWN,
      FI: TO_BE_DRAWN,
      UA: TO_BE_DRAWN,
      PL: TO_BE_DRAWN,
      RU: NOT_PARTICIPATING,
    });
    expect(plan.waitingCount).toBe(5);
    expect(plan.previousHostTo).toBe(TO_BE_DRAWN);
  });

  it('remembers where each waiting country came from, the old host in the smaller semi', () => {
    const plan = planNextYear(input());

    // SF1 is left with Sweden only, SF2 has three: Austria balances SF1.
    expect(plan.waitingFrom).toEqual({
      SE: 'SF1',
      FI: 'SF2',
      UA: 'SF2',
      PL: 'SF2',
      AT: 'SF1',
    });
  });

  it('keeps the old host in the final when asked to', () => {
    const plan = planNextYear(input({ previousHostLeavesFinal: false }));

    expect(plan.canMovePreviousHost).toBe(true);
    expect(plan.previousHostTo).toBeNull();
    expect(plan.assignments.AT).toBe('GF');
  });

  it('changes nothing about the host when the host won at home', () => {
    const plan = planNextYear(input({ winnerCode: 'AT' }));

    expect(plan.preQualified).toEqual([]);
    expect(plan.canMovePreviousHost).toBe(false);
    expect(plan.assignments.AT).toBe('GF');
  });

  it('pre-qualifies a host other than the winner too', () => {
    const plan = planNextYear(input({ winnerCode: 'UA', newHostCode: 'PL' }));

    expect(plan.preQualified).toEqual([
      { code: 'UA', as: 'winner' },
      { code: 'PL', as: 'host' },
    ]);
    expect(plan.assignments.UA).toBe('GF');
    expect(plan.assignments.PL).toBe('GF');
  });

  it('leaves a Big Five winner where it was', () => {
    const plan = planNextYear(input({ winnerCode: 'FR' }));

    expect(plan.preQualified).toEqual([]);
    expect(plan.assignments.FR).toBe('GF');
    expect(plan.assignments.NO).toBe(TO_BE_DRAWN);
  });

  it('keeps the semis without a draw and moves the old host into the semi', () => {
    const plan = planNextYear(
      input({
        stages: ONE_SEMI,
        assignments: { AT: 'GF', NO: 'SF1', SE: 'SF1' },
      }),
    );

    expect(plan.usesDraw).toBe(false);
    expect(plan.waitingCount).toBe(0);
    expect(plan.assignments).toEqual({ AT: 'SF1', NO: 'GF', SE: 'SF1' });
    expect(plan.previousHostTo).toBe('SF1');
  });

  it('only moves the winner in Grand Final only mode', () => {
    const plan = planNextYear(
      input({
        isGfOnly: true,
        assignments: { AT: 'GF', NO: 'GF', SE: NOT_QUALIFIED },
        newHostCode: 'SE',
      }),
    );

    expect(plan.usesDraw).toBe(false);
    expect(plan.canMovePreviousHost).toBe(false);
    expect(plan.assignments).toEqual({ AT: 'GF', NO: 'GF', SE: 'GF' });
    expect(plan.preQualified).toEqual([{ code: 'SE', as: 'host' }]);
  });

  it('lets an unticked winner from a semi go into the draw with the rest', () => {
    const plan = planNextYear(input({ winnerPreQualifies: false }));

    expect(plan.canChooseWinner).toBe(true);
    expect(plan.preQualified).toEqual([]);
    expect(plan.assignments.NO).toBe(TO_BE_DRAWN);
    expect(plan.waitingFrom.NO).toBe('SF1');
    expect(plan.waitingCount).toBe(6);
  });

  it('keeps the semis as they are when the draw is skipped', () => {
    const plan = planNextYear(input({ useDraw: false }));

    expect(plan.drawAvailable).toBe(true);
    expect(plan.usesDraw).toBe(false);
    expect(plan.waitingCount).toBe(0);
    expect(plan.waitingFrom).toEqual({});
    // Norway left SF1 for the final; Austria joins the smaller semi.
    expect(plan.assignments).toMatchObject({
      NO: 'GF',
      SE: 'SF1',
      AT: 'SF1',
      FI: 'SF2',
      UA: 'SF2',
      PL: 'SF2',
    });
    expect(plan.previousHostTo).toBe('SF1');
  });

  it('keeps an unticked winner in its semi when the draw is skipped', () => {
    const plan = planNextYear(
      input({ useDraw: false, winnerPreQualifies: false }),
    );

    expect(plan.assignments.NO).toBe('SF1');
    expect(plan.preQualified).toEqual([]);
  });

  it('lets a winner that won at home give up its place', () => {
    const kept = planNextYear(input({ winnerCode: 'AT' }));
    const unticked = planNextYear(
      input({ winnerCode: 'AT', winnerPreQualifies: false }),
    );

    expect(kept.canChooseWinner).toBe(true);
    expect(kept.assignments.AT).toBe('GF');
    expect(unticked.assignments.AT).toBe(TO_BE_DRAWN);
    expect(unticked.waitingFrom.AT).toBe('SF1');
  });

  it('gives no choice for a winner that is in the final anyway', () => {
    expect(planNextYear(input({ winnerCode: 'FR' })).canChooseWinner).toBe(
      false,
    );
    expect(
      planNextYear(
        input({
          isGfOnly: true,
          winnerCode: 'AT',
          assignments: { AT: 'GF', NO: 'GF' },
        }),
      ).canChooseWinner,
    ).toBe(false);
  });

  it('does nothing without stages', () => {
    const plan = planNextYear(input({ stages: [] }));

    expect(plan.assignments).toEqual(ASSIGNMENTS);
    expect(plan.preQualified).toEqual([]);
  });
});

describe('next year helpers', () => {
  it('counts the year up', () => {
    expect(followingYear('2026')).toBe('2027');
    expect(followingYear(' 7 ')).toBe('8');
    expect(followingYear('9999')).toBe('');
    expect(followingYear('Season 3')).toBe('');
    expect(followingYear('')).toBe('');
  });

  it('keeps a Big Five host at Eurovision only', () => {
    expect(hostLeavesFinalByDefault('esc', 'AT')).toBe(true);
    expect(hostLeavesFinalByDefault('esc', 'GB')).toBe(false);
    expect(hostLeavesFinalByDefault('jesc', 'GB')).toBe(true);
  });
});
