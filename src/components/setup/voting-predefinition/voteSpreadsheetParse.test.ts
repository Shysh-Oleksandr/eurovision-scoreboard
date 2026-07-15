import { describe, expect, it } from 'vitest';

import {
  mergeImportedVotes,
  normalizeCountryLabel,
  parseVoteSpreadsheetGrid,
  resolveCountryCode,
  splitIntoSections,
} from './voteSpreadsheetParse';

import type { PointsItem } from '@/state/generalStore';
import { StageVotingMode } from '@/models';

const pointsSystem: PointsItem[] = [
  { value: 12, id: 0, showDouzePoints: true },
  { value: 10, id: 1, showDouzePoints: false },
  { value: 8, id: 2, showDouzePoints: false },
  { value: 7, id: 3, showDouzePoints: false },
  { value: 6, id: 4, showDouzePoints: false },
];

const participants = [
  { code: 'AD', name: 'Andorra' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BE', name: 'Belgium' },
];

const voters = [
  { code: 'AD', name: 'Andorra' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BE', name: 'Belgium' },
  { code: 'WW', name: 'Rest of the World' },
];

const baseCtx = {
  participants,
  voters,
  juryPointsSystem: pointsSystem,
  televotePointsSystem: pointsSystem,
  votingMode: StageVotingMode.JURY_AND_TELEVOTE,
};

const jurySection = [
  ['', 'JURY S2', 'TOT', 'Andorra', 'Azerbaijan', 'Belgium', 'Rest of the World'],
  ['7', 'Andorra', '32', '', '', '8', '12'],
  ['15', 'Azerbaijan', '76', '6', '', '10', '7'],
];

const jurySectionWithoutTot = [
  ['', 'JURY', 'Andorra', 'Azerbaijan', 'Belgium'],
  ['Andorra', '', '8', '12', ''],
  ['Azerbaijan', '6', '', '10', '7'],
];

describe('voteSpreadsheetParse', () => {
  it('normalizes country labels', () => {
    expect(normalizeCountryLabel('Bosnia & Herzegovina')).toBe(
      'bosnia and herzegovina',
    );
  });

  it('resolves Rest of the World aliases', () => {
    expect(resolveCountryCode('Rest of the World', voters)).toBe('WW');
    expect(resolveCountryCode('ROTW', voters)).toBe('WW');
  });

  it('parses a named jury section with TOT column', () => {
    const parsed = parseVoteSpreadsheetGrid(jurySection, baseCtx);
    expect(parsed).not.toBeNull();
    expect(parsed!.jury).toBeDefined();
    expect(parsed!.appliedCells).toBeGreaterThan(0);
  });

  it('parses a section without a TOT column', () => {
    const parsed = parseVoteSpreadsheetGrid(jurySectionWithoutTot, baseCtx);
    expect(parsed).not.toBeNull();
    expect(parsed!.jury).toBeDefined();
    expect(parsed!.appliedCells).toBeGreaterThan(0);
  });

  it('imports jury and televote from separate sections', () => {
    const televoteSection = [
      ['', 'TELEVOTE S2', 'TOT', 'Andorra', 'Azerbaijan', 'Belgium'],
      ['7', 'Andorra', '0', '', '', ''],
      ['15', 'Azerbaijan', '160', '10', '', '12'],
    ];
    const grid = [...jurySection, [], ...televoteSection];
    const parsed = parseVoteSpreadsheetGrid(grid, baseCtx);

    expect(parsed?.jury).toBeDefined();
    expect(parsed?.televote).toBeDefined();
    expect(parsed?.skippedSections).not.toContain('combined');
  });

  it('reports unmatched country names', () => {
    const grid = [
      ['', 'JURY', 'TOT', 'Andorra', 'Azerbaijan', 'Belgium'],
      ['1', 'Narnia', '10', '5', '12', ''],
      ['2', 'Andorra', '20', '', '8', '12'],
    ];
    const parsed = parseVoteSpreadsheetGrid(grid, baseCtx);
    expect(parsed).not.toBeNull();
    expect(parsed!.unmatched).toContain('Narnia');
  });

  it('merges imported votes into existing state', () => {
    const parsed = parseVoteSpreadsheetGrid(jurySection, baseCtx);
    expect(parsed).not.toBeNull();

    const merged = mergeImportedVotes(
      {
        televote: {
          AD: [
            {
              countryCode: 'BE',
              points: 12,
              pointsId: 0,
              showDouzePointsAnimation: true,
            },
          ],
        },
      },
      parsed!,
    );

    expect(merged.jury).toBeDefined();
    expect(merged.televote?.AD).toBeDefined();
  });

  it('splits sections on empty rows', () => {
    const sections = splitIntoSections([['a'], [], ['b']]);
    expect(sections).toHaveLength(2);
  });
});
