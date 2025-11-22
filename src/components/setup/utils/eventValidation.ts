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
  t: any,
) => {
  const { stages, autoQualifiersCount, grandFinalQualifiersCount } = params;

  const minStageParticipants = pointsSystemLength + 1;

  if (!isGrandFinalOnly) {
    const semiFinalStages = stages.filter((s) => s.id !== StageId.GF);

    for (const stage of semiFinalStages) {
      if (stage.countriesCount === 0) {
        return t('validation.noCountriesInStage', { stageName: stage.name });
      }
      if (stage.votingCountries.length === 0) {
        return t('validation.noVotingCountriesInStage', { stageName: stage.name });
      }
      if (stage.qualifiersAmount <= 0) {
        return t('validation.qualifiersAmountMustBeAtLeast1', { stageName: stage.name });
      }
      if (stage.qualifiersAmount >= stage.countriesCount) {
        return t('validation.qualifiersAmountMustBeLessThanParticipants', { stageName: stage.name });
      }
      if (
        stage.countriesCount < minStageParticipants &&
        stage.votingMode !== StageVotingMode.TELEVOTE_ONLY
      ) {
        return t('validation.participantsMustBeAtLeast', { stageName: stage.name, count: minStageParticipants });
      }
    }

    const totalQualifiers =
      semiFinalStages.reduce(
        (acc, stage) => acc + (stage.qualifiersAmount || 0),
        0,
      ) + autoQualifiersCount;

    if (totalQualifiers < minStageParticipants) {
      return t('validation.totalQualifiersMustBeAtLeast', { count: minStageParticipants });
    }
  } else if (grandFinalQualifiersCount < minStageParticipants) {
    return t('validation.grandFinalParticipantsMustBeAtLeast', { count: minStageParticipants });
  }

  return null;
};
