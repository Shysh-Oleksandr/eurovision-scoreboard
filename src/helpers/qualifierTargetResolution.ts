import { EventStage, QualifierTarget } from '@/models';

export const isRankBasedQualification = (
  qualifiesTo: QualifierTarget[],
): boolean => qualifiesTo.some((target) => target.minRank || target.maxRank);

export const getTotalQualifiersAmount = (
  qualifiesTo: QualifierTarget[] | undefined,
): number => {
  if (!qualifiesTo?.length) return 0;

  if (isRankBasedQualification(qualifiesTo)) {
    return qualifiesTo.reduce((sum, target) => {
      if (target.minRank && target.maxRank) {
        return sum + (target.maxRank - target.minRank + 1);
      }

      return sum + target.amount;
    }, 0);
  }

  return qualifiesTo.reduce((sum, target) => sum + target.amount, 0);
};

export const resolveTargetStageIdForRank = (
  rank: number,
  qualifiesTo: QualifierTarget[],
): string | null => {
  if (qualifiesTo.length === 0 || rank < 1) return null;

  if (isRankBasedQualification(qualifiesTo)) {
    for (const target of qualifiesTo) {
      if (target.minRank && target.maxRank) {
        if (rank >= target.minRank && rank <= target.maxRank) {
          return target.targetStageId;
        }
      } else if (target.minRank && !target.maxRank) {
        if (rank >= target.minRank) {
          return target.targetStageId;
        }
      }
    }

    return null;
  }

  let cumulative = 0;

  for (const target of qualifiesTo) {
    cumulative += target.amount;

    if (rank <= cumulative) {
      return target.targetStageId;
    }
  }

  return null;
};

export const getCountryRank = (
  countryCode: string,
  rankedCountryCodes: string[],
): number | null => {
  const index = rankedCountryCodes.indexOf(countryCode);

  return index === -1 ? null : index + 1;
};

export const getQualifierTargetStageId = (
  countryCode: string,
  qualifiesTo: QualifierTarget[] | undefined,
  rankedCountryCodes: string[],
): string | null => {
  if (!qualifiesTo?.length) return null;

  const rank = getCountryRank(countryCode, rankedCountryCodes);

  if (rank === null) return null;

  return resolveTargetStageIdForRank(rank, qualifiesTo);
};

export const buildQualifierTargetStageNameMap = (
  qualifiedCountryCodes: string[],
  qualifiesTo: QualifierTarget[] | undefined,
  rankedCountryCodes: string[],
  eventStages: EventStage[],
): Map<string, string> => {
  const map = new Map<string, string>();

  for (const countryCode of qualifiedCountryCodes) {
    const targetStageId = getQualifierTargetStageId(
      countryCode,
      qualifiesTo,
      rankedCountryCodes,
    );

    if (!targetStageId) continue;

    const targetStage = eventStages.find((stage) => stage.id === targetStageId);

    if (targetStage) {
      map.set(countryCode, targetStage.name);
    }
  }

  return map;
};

export const getQualifierTargetStageNames = (
  qualifiesTo: QualifierTarget[] | undefined,
  eventStages: EventStage[],
): string[] => {
  if (!qualifiesTo?.length) return [];

  return qualifiesTo
    .map(
      (target) =>
        eventStages.find((stage) => stage.id === target.targetStageId)?.name,
    )
    .filter((name): name is string => !!name);
};
