import { describe, expect, it } from 'vitest';

import { getVoterStatus, isChannelOn, toggleChannel } from './voterStatus';

import { CountryAssignmentGroup } from '@/models';

const assignments: Record<string, string> = {
  BE: 'sf1',
  AL: 'sf2',
  DE: 'gf',
  AD: CountryAssignmentGroup.NOT_PARTICIPATING,
  BY: CountryAssignmentGroup.NOT_QUALIFIED,
};
const stageCodes = new Set(['BE']);

describe('getVoterStatus', () => {
  const status = (code: string, aqSemiFinalGroup?: string) =>
    getVoterStatus(
      { code, name: code, aqSemiFinalGroup } as never,
      'sf1',
      stageCodes,
      assignments,
    );

  it('names where each voter stands', () => {
    expect(status('BE')).toBe('inStage');
    expect(status('AL')).toBe('otherStage');
    expect(status('AD')).toBe('notParticipating');
    expect(status('BY')).toBe('notParticipating');
    expect(status('XX')).toBe('notParticipating');
  });

  it('puts a pre-qualified voter of this stage first', () => {
    expect(status('DE', 'SF1')).toBe('autoQ');
    expect(status('DE', 'sf2')).toBe('otherStage');
  });
});

describe('toggleChannel', () => {
  it('switches one channel and keeps the other', () => {
    expect(toggleChannel('both', 'jury')).toBe('televote');
    expect(toggleChannel('both', 'televote')).toBe('jury');
    expect(toggleChannel('televote', 'jury')).toBe('both');
    expect(toggleChannel('jury', 'televote')).toBe('both');
  });

  it('reads a mode per channel', () => {
    expect(isChannelOn('both', 'jury')).toBe(true);
    expect(isChannelOn('televote', 'jury')).toBe(false);
    expect(isChannelOn('jury', 'televote')).toBe(false);
  });
});
