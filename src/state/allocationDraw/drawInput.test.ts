import { describe, expect, it } from 'vitest';

import {
  buildDrawInput,
  getDefaultDrawSemis,
  getDrawableSemis,
  getDrawSemis,
} from './drawInput';
import { createOfficialRules, DrawRules } from './types';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
  StageVotingMode,
} from '@/models';

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

const ids = (stages: EventStage[]) => stages.map((s) => s.id);

const rules = (patch: Partial<DrawRules> = {}): DrawRules => ({
  ...createOfficialRules(),
  ...patch,
});

// SF1 + SF2 → GF
const TWO_SEMIS = [
  stage('GF', 2),
  stage('SF1', 0, { GF: 10 }),
  stage('SF2', 1, { GF: 10 }),
];

// Four heats → two semi-finals → GF
const HEATS = [
  stage('H1', 0, { SF1: 3 }),
  stage('H2', 1, { SF1: 3 }),
  stage('H3', 2, { SF2: 3 }),
  stage('H4', 3, { SF2: 3 }),
  stage('SF1', 4, { GF: 5 }),
  stage('SF2', 5, { GF: 5 }),
  stage('GF', 6),
];

// A small pre-qualifying round feeding semis that also have direct entries
const PRE_QUALIFIER = [
  stage('PQ', 0, { SF1: 1, SF2: 1 }),
  stage('SF1', 1, { GF: 10 }),
  stage('SF2', 2, { GF: 10 }),
  stage('GF', 3),
];

describe('draw stages', () => {
  it('draws into both semis of a regular contest', () => {
    expect(ids(getDrawableSemis(TWO_SEMIS))).toEqual(['SF1', 'SF2']);
    expect(ids(getDefaultDrawSemis(TWO_SEMIS))).toEqual(['SF1', 'SF2']);
    expect(ids(getDrawSemis(TWO_SEMIS, rules()))).toEqual(['SF1', 'SF2']);
  });

  it('draws into the heats only when heats qualify into semi-finals', () => {
    expect(ids(getDrawableSemis(HEATS))).toEqual([
      'H1',
      'H2',
      'H3',
      'H4',
      'SF1',
      'SF2',
    ]);
    expect(ids(getDrawSemis(HEATS, rules()))).toEqual(['H1', 'H2', 'H3', 'H4']);
  });

  it('starts "Choose" from the first round and lets later rounds be ticked', () => {
    expect(ids(getDrawSemis(HEATS, rules({ semis: 'choose' })))).toEqual([
      'H1',
      'H2',
      'H3',
      'H4',
    ]);
    expect(
      ids(
        getDrawSemis(
          HEATS,
          rules({ semis: 'choose', semisPick: { H1: false, SF1: true } }),
        ),
      ),
    ).toEqual(['H2', 'H3', 'H4', 'SF1']);
  });

  it('ignores the picks while every first-round stage is drawn', () => {
    expect(
      ids(getDrawSemis(HEATS, rules({ semisPick: { H1: false, SF1: true } }))),
    ).toEqual(['H1', 'H2', 'H3', 'H4']);
  });

  it('falls back to every drawable stage when the first round is a single stage', () => {
    expect(ids(getDefaultDrawSemis(PRE_QUALIFIER))).toEqual([
      'PQ',
      'SF1',
      'SF2',
    ]);
  });

  it('builds the input from the heats, leaving the semi-finals out', () => {
    const countries = ['AL', 'BE', 'CY', 'DK', 'EE', 'FI', 'GR', 'HR'].map(
      (code) => ({ code, name: code } as BaseCountry),
    );
    const assignments: Record<string, string> = {
      AL: CountryAssignmentGroup.TO_BE_DRAWN,
      BE: CountryAssignmentGroup.TO_BE_DRAWN,
      CY: CountryAssignmentGroup.TO_BE_DRAWN,
      DK: CountryAssignmentGroup.TO_BE_DRAWN,
      EE: CountryAssignmentGroup.TO_BE_DRAWN,
      FI: 'H1',
      GR: 'SF1',
      HR: 'GF',
    };
    const input = buildDrawInput({
      stages: HEATS,
      assignments,
      countries,
      officialPotByCode: {},
      rules: rules({ pots: 'none' }),
      votesIn: {},
      affinity: null,
    });

    expect(input.semis.map((s) => s.id)).toEqual(['H1', 'H2', 'H3', 'H4']);
    expect(input.entrants).toEqual([
      { code: 'AL', fixed: null },
      { code: 'BE', fixed: null },
      { code: 'CY', fixed: null },
      { code: 'DK', fixed: null },
      { code: 'EE', fixed: null },
      { code: 'FI', fixed: 'H1' },
    ]);
    expect(input.preq).toEqual([{ code: 'HR', votesIn: 'drawn' }]);
  });
});
