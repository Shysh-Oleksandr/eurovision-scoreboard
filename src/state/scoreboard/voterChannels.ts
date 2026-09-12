import {
  EventStage,
  StageVotingMode,
  VoterChannelMode,
  VoterChannels,
  VotingCountry,
} from '@/models';

/** A concrete vote channel a stage phase reads ballots from. */
export type VoteChannel = 'jury' | 'televote' | 'combined';

/** Country code of the "Rest of the World" voter. */
export const ROTW_CODE = 'WW';

/** Rest of the World is a televote-only voter unless the user says otherwise. */
export const getDefaultVoterChannelMode = (code: string): VoterChannelMode =>
  code === ROTW_CODE ? 'televote' : 'both';

export const getVoterChannelMode = (
  code: string,
  voterChannels?: VoterChannels,
): VoterChannelMode =>
  voterChannels?.[code] ?? getDefaultVoterChannelMode(code);

/**
 * Whether a voter casts a ballot in `channel`. The combined channel is one
 * spokesperson-style ballot per voter, so it needs jury eligibility.
 */
export const isVoterInChannel = (
  code: string,
  channel: VoteChannel,
  voterChannels?: VoterChannels,
): boolean => {
  const mode = getVoterChannelMode(code, voterChannels);

  return channel === 'televote' ? mode !== 'jury' : mode !== 'televote';
};

export const filterVotersByChannel = <T extends { code: string }>(
  voters: T[],
  channel: VoteChannel | 'all',
  voterChannels?: VoterChannels,
): T[] =>
  channel === 'all'
    ? voters
    : voters.filter((voter) =>
        isVoterInChannel(voter.code, channel, voterChannels),
      );

/**
 * Per-voter overrides only apply in Jury and Televote mode — the one mode with
 * two channels. In other modes they are kept but paused, so only the defaults
 * (Rest of the World = televote) remain in effect.
 */
export const getEffectiveVoterChannels = (
  stage: Pick<EventStage, 'votingMode' | 'voterChannels'>,
): VoterChannels | undefined =>
  stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE
    ? stage.voterChannels
    : undefined;

/** The channel the stage is currently voting in. */
export const getStagePhaseChannel = (
  stage: Pick<EventStage, 'votingMode' | 'isJuryVoting'>,
): VoteChannel => {
  switch (stage.votingMode) {
    case StageVotingMode.JURY_ONLY:
      return 'jury';
    case StageVotingMode.TELEVOTE_ONLY:
      return 'televote';
    case StageVotingMode.COMBINED:
      return 'combined';
    default:
      return stage.isJuryVoting ? 'jury' : 'televote';
  }
};

/** Does the mode have a phase reading the given channel? */
export const stageUsesChannel = (
  votingMode: StageVotingMode,
  channel: 'jury' | 'televote',
): boolean => {
  if (votingMode === StageVotingMode.JURY_AND_TELEVOTE) return true;
  if (votingMode === StageVotingMode.COMBINED) return channel === 'jury';

  return channel === 'jury'
    ? votingMode === StageVotingMode.JURY_ONLY
    : votingMode === StageVotingMode.TELEVOTE_ONLY;
};

/**
 * Prune overrides for voters no longer in the list and drop entries equal to
 * the default. Returns `undefined` when nothing non-default remains.
 */
export const normalizeVoterChannels = (
  voters: VotingCountry[],
  voterChannels?: VoterChannels,
): VoterChannels | undefined => {
  if (!voterChannels) return undefined;

  const codes = new Set(voters.map((voter) => voter.code));
  const normalized: VoterChannels = {};

  Object.entries(voterChannels).forEach(([code, mode]) => {
    if (codes.has(code) && mode !== getDefaultVoterChannelMode(code)) {
      normalized[code] = mode;
    }
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const countVotersByChannel = (
  voters: VotingCountry[],
  voterChannels?: VoterChannels,
): { jury: number; televote: number } => ({
  jury: filterVotersByChannel(voters, 'jury', voterChannels).length,
  televote: filterVotersByChannel(voters, 'televote', voterChannels).length,
});
