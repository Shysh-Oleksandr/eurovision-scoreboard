import { BaseCountry, StageId, StageVotingMode } from '../../../models';

interface StageValidationInfo {
  id: string;
  qualifiersAmount: number;
  countriesCount: number;
  votingCountries: BaseCountry[];
  name: string;
  votingMode: StageVotingMode;
}
interface ValidationParams {
  stages: StageValidationInfo[];
  autoQualifiersCount: number;
  grandFinalQualifiersCount: number;
}

export const validateEventSetup = (
  isGrandFinalOnly: boolean,
  pointsSystemLength: number,
  params: ValidationParams,
) => {
  const { stages, autoQualifiersCount, grandFinalQualifiersCount } = params;

  const minStageParticipants = pointsSystemLength + 1;

  if (!isGrandFinalOnly) {
    const semiFinalStages = stages.filter((s) => s.id !== StageId.GF);

    for (const stage of semiFinalStages) {
      if (stage.countriesCount === 0) {
        return `There are no countries in ${stage.name}.`;
      }
      if (stage.votingCountries.length === 0) {
        return `There are no voting countries in ${stage.name}.`;
      }
      if (stage.qualifiersAmount <= 0) {
        return 'The number of qualifiers must be at least 1.';
      }
      if (stage.qualifiersAmount >= stage.countriesCount) {
        return 'The number of qualifiers must be less than the number of participants.';
      }
      if (
        stage.countriesCount < minStageParticipants &&
        stage.votingMode !== StageVotingMode.TELEVOTE_ONLY
      ) {
        return `The number of participants in ${stage.name} must be at least ${minStageParticipants} (depends on the number of items in the points system).`;
      }
    }

    const totalQualifiers =
      semiFinalStages.reduce(
        (acc, stage) => acc + (stage.qualifiersAmount || 0),
        0,
      ) + autoQualifiersCount;

    if (totalQualifiers < minStageParticipants) {
      return `The total number of qualifiers for the Grand Final must be at least ${minStageParticipants}.`;
    }
  } else if (grandFinalQualifiersCount < minStageParticipants) {
    return `The number of the Grand Final participants must be at least ${minStageParticipants}.`;
  }

  return null;
};
