import { StageId } from '../../../models';

interface StageValidationInfo {
  id: string;
  qualifiersAmount: number;
  countriesCount: number;
}

interface ValidationParams {
  stages: StageValidationInfo[];
  autoQualifiersCount: number;
  grandFinalQualifiersCount: number;
}

export const validateEventSetup = (
  isGrandFinalOnly: boolean,
  params: ValidationParams,
) => {
  const { stages, autoQualifiersCount, grandFinalQualifiersCount } = params;

  if (!isGrandFinalOnly) {
    const semiFinalStages = stages.filter((s) => s.id !== StageId.GF);

    if (semiFinalStages.some((s) => s.countriesCount === 0)) {
      return 'There are no countries in one of the Semi-Finals.';
    }

    for (const stage of semiFinalStages) {
      if (stage.qualifiersAmount <= 0) {
        return 'The number of qualifiers must be at least 1.';
      }
      if (stage.qualifiersAmount >= stage.countriesCount) {
        return 'The number of qualifiers must be less than the number of participants.';
      }
    }

    const totalQualifiers =
      semiFinalStages.reduce(
        (acc, stage) => acc + (stage.qualifiersAmount || 0),
        0,
      ) + autoQualifiersCount;

    if (totalQualifiers < 11) {
      return 'The total number of qualifiers for the Grand Final must be at least 11.';
    }
  } else if (grandFinalQualifiersCount < 11) {
    return 'The number of the Grand Final participants must be at least 11.';
  }

  return null;
};
