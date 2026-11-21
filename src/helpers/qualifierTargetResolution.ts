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

/**
 * One target stage's share of a stage's qualifying places: places
 * `start` … `start + size - 1` (0-based, in rank order) go to it.
 */
export interface QualifierSection {
  targetStageId: string;
  /** The target stage's name; empty when the stage is gone. */
  stageName: string;
  start: number;
  size: number;
}

/**
 * The qualifying places split by target stage, best places first: rank
 * ranges in rank order, amounts in the order they're listed (as the
 * qualifiers are handed out when the stage ends).
 */
export const getQualifierSections = (
  qualifiesTo: QualifierTarget[] | undefined,
  eventStages: EventStage[],
): QualifierSection[] => {
  if (!qualifiesTo?.length) return [];

  const targets = isRankBasedQualification(qualifiesTo)
    ? [...qualifiesTo].sort(
        (a, b) => (a.minRank ?? Infinity) - (b.minRank ?? Infinity),
      )
    : qualifiesTo;
  let start = 0;

  return targets.flatMap((target) => {
    const size =
      target.minRank && target.maxRank
        ? target.maxRank - target.minRank + 1
        : target.amount;

    if (!(size > 0)) return [];

    const section = {
      targetStageId: target.targetStageId,
      stageName:
        eventStages.find((stage) => stage.id === target.targetStageId)?.name ??
        '',
      start,
      size,
    };

    start += size;

    return [section];
  });
};

/** The section holding a place (0-based), or -1 past the last place. */
export const getSectionIndexForPlace = (
  sections: QualifierSection[],
  place: number,
): number =>
  sections.findIndex(
    (section) => place >= section.start && place < section.start + section.size,
  );

/**
 * Pick qualifiers mode fills the target stages one after another: the first
 * picks take the best places, so they go to the first target stage. With
 * `qualifiedCount` picked, how many places the one being filled has left
 * (0 once every place is taken).
 */
export const getOpenPlacesInActiveSection = (
  qualifiesTo: QualifierTarget[] | undefined,
  qualifiedCount: number,
): number => {
  const sections = getQualifierSections(qualifiesTo, []);
  const section = sections[getSectionIndexForPlace(sections, qualifiedCount)];

  return section ? section.start + section.size - qualifiedCount : 0;
};

/**
 * The qualifiers split by section, each section keeping the given order.
 * `placeOf` says where a qualifier stands (its rank, or its pick order while
 * places are being picked); one beyond the places lands in the last section.
 */
export const groupQualifiersBySection = <T>(
  sections: QualifierSection[],
  qualifiers: T[],
  placeOf: (qualifier: T, index: number) => number,
): T[][] => {
  const groups = sections.map((): T[] => []);

  qualifiers.forEach((qualifier, index) => {
    const sectionIndex = getSectionIndexForPlace(
      sections,
      placeOf(qualifier, index),
    );

    groups[sectionIndex === -1 ? groups.length - 1 : sectionIndex]?.push(
      qualifier,
    );
  });

  return groups;
};

export const getGrandFinalStage = (
  eventStages: EventStage[],
): EventStage | undefined =>
  eventStages.find((stage) => stage.isLastStage) ??
  eventStages[eventStages.length - 1];

/** True when every qualifier from the current stage advances only to the Grand Final. */
export const qualifiesOnlyToGrandFinal = (
  qualifiesTo: QualifierTarget[] | undefined,
  eventStages: EventStage[],
): boolean => {
  if (!qualifiesTo?.length || !eventStages.length) return false;

  const grandFinalStage = getGrandFinalStage(eventStages);

  if (!grandFinalStage) return false;

  const targetStageIds = new Set(
    qualifiesTo.map((target) => target.targetStageId),
  );

  return targetStageIds.size === 1 && targetStageIds.has(grandFinalStage.id);
};

export const shouldShowQualifierTargetLabels = (
  qualifiesTo: QualifierTarget[] | undefined,
  eventStages: EventStage[],
  enabled = true,
): boolean => enabled && !qualifiesOnlyToGrandFinal(qualifiesTo, eventStages);
