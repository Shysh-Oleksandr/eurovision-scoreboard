import { describe, expect, it } from 'vitest';

import {
  countVotersByChannel,
  filterVotersByChannel,
  getEffectiveVoterChannels,
  getStagePhaseChannel,
  getVoterChannelMode,
  isVoterInChannel,
  normalizeVoterChannels,
  stageUsesChannel,
} from './voterChannels';

import { StageVotingMode } from '@/models';

const voters = [
  { code: 'SE', name: 'Sweden' },
  { code: 'GR', name: 'Greece' },
  { code: 'WW', name: 'Rest of the World' },
];

describe('voterChannels', () => {
  it('defaults every voter to both, except WW which is televote-only', () => {
    expect(getVoterChannelMode('SE')).toBe('both');
    expect(getVoterChannelMode('WW')).toBe('televote');
    expect(isVoterInChannel('WW', 'jury')).toBe(false);
    expect(isVoterInChannel('WW', 'combined')).toBe(false);
    expect(isVoterInChannel('WW', 'televote')).toBe(true);
  });

  it('honours overrides', () => {
    const voterChannels = { WW: 'both', GR: 'televote', SE: 'jury' } as const;

    expect(filterVotersByChannel(voters, 'jury', voterChannels)).toEqual([
      voters[0],
      voters[2],
    ]);
    expect(filterVotersByChannel(voters, 'televote', voterChannels)).toEqual([
      voters[1],
      voters[2],
    ]);
    expect(filterVotersByChannel(voters, 'all', voterChannels)).toEqual(voters);
    expect(countVotersByChannel(voters, voterChannels)).toEqual({
      jury: 2,
      televote: 2,
    });
  });

  it('keeps legacy behaviour without overrides', () => {
    expect(filterVotersByChannel(voters, 'jury')).toEqual(voters.slice(0, 2));
    expect(filterVotersByChannel(voters, 'televote')).toEqual(voters);
  });

  it('normalizes overrides against the voter list', () => {
    expect(
      normalizeVoterChannels(voters, {
        SE: 'both',
        WW: 'televote',
        GR: 'jury',
        NO: 'televote',
      }),
    ).toEqual({ GR: 'jury' });
    expect(normalizeVoterChannels(voters, { SE: 'both' })).toBeUndefined();
    expect(normalizeVoterChannels(voters, { WW: 'both' })).toEqual({
      WW: 'both',
    });
  });

  it('pauses overrides outside Jury and Televote mode', () => {
    const voterChannels = { WW: 'both', GR: 'televote' } as const;

    expect(
      getEffectiveVoterChannels({
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        voterChannels,
      }),
    ).toBe(voterChannels);
    expect(
      getEffectiveVoterChannels({
        votingMode: StageVotingMode.JURY_ONLY,
        voterChannels,
      }),
    ).toBeUndefined();
  });

  it('resolves the phase channel from the voting mode', () => {
    expect(
      getStagePhaseChannel({
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        isJuryVoting: true,
      }),
    ).toBe('jury');
    expect(
      getStagePhaseChannel({
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        isJuryVoting: false,
      }),
    ).toBe('televote');
    expect(
      getStagePhaseChannel({
        votingMode: StageVotingMode.COMBINED,
        isJuryVoting: true,
      }),
    ).toBe('combined');
    expect(
      getStagePhaseChannel({
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        isJuryVoting: false,
      }),
    ).toBe('televote');
    expect(stageUsesChannel(StageVotingMode.COMBINED, 'televote')).toBe(false);
    expect(stageUsesChannel(StageVotingMode.JURY_ONLY, 'jury')).toBe(true);
  });
});
