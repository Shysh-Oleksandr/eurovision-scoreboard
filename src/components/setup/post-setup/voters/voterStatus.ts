import {
  BaseCountry,
  CountryAssignmentGroup,
  VoterChannelMode,
} from '@/models';

export type VoterStatus =
  | 'inStage'
  | 'otherStage'
  | 'autoQ'
  | 'notParticipating';

/**
 * Where a voter stands in this stage: performing in it, pre-qualified and
 * voting here (the year data's `aqSemiFinalGroup`), performing in another
 * stage, or not taking part.
 */
export const getVoterStatus = (
  country: BaseCountry,
  stageId: string,
  stageCodes: ReadonlySet<string>,
  eventAssignments: Record<string, string>,
): VoterStatus => {
  const id = stageId.toLowerCase();

  if (country.aqSemiFinalGroup?.toLowerCase() === id) return 'autoQ';

  const group = eventAssignments[country.code];

  if (group === stageId || stageCodes.has(country.code)) return 'inStage';

  if (
    group &&
    group !== CountryAssignmentGroup.NOT_PARTICIPATING &&
    group !== CountryAssignmentGroup.NOT_QUALIFIED
  ) {
    return 'otherStage';
  }

  return 'notParticipating';
};

export type Channel = 'jury' | 'televote';

export const isChannelOn = (mode: VoterChannelMode, channel: Channel) =>
  channel === 'jury' ? mode !== 'televote' : mode !== 'jury';

/** The mode after switching `channel`; never leaves a voter with none. */
export const toggleChannel = (
  mode: VoterChannelMode,
  channel: Channel,
): VoterChannelMode => {
  const jury =
    channel === 'jury' ? !isChannelOn(mode, 'jury') : mode !== 'televote';
  const televote =
    channel === 'televote' ? !isChannelOn(mode, 'televote') : mode !== 'jury';

  if (jury && televote) return 'both';

  return jury ? 'jury' : 'televote';
};
