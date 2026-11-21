import { useMemo } from 'react';

import {
  getQualifierSections,
  groupQualifiersBySection,
  QualifierSection,
} from '@/helpers/qualifierTargetResolution';
import { EventStage } from '@/models';
import { createCountriesComparator } from '@/state/scoreboard/helpers';
import { useScoreboardStore } from '@/state/scoreboardStore';

export type QualifierSectionGroup<T> = QualifierSection & {
  /** This target stage's qualifiers, in the order they were given. */
  qualifiers: T[];
};

/**
 * A stage's qualifiers split by the target stage they go to (one group per
 * target, best places first). `byPickOrder`: Pick qualifiers mode while
 * places are being picked, which fills the target stages one after another.
 * Otherwise by rank, as the stage hands its qualifiers out.
 */
export const useQualifierSections = <T extends { code: string }>(
  stage: EventStage | undefined,
  qualifiers: T[],
  byPickOrder: boolean,
): QualifierSectionGroup<T>[] => {
  const eventStages = useScoreboardStore((state) => state.eventStages);

  return useMemo(() => {
    const sections = getQualifierSections(stage?.qualifiesTo, eventStages);

    if (!stage || sections.length === 0) return [];

    let placeOf = (_qualifier: T, index: number) => index;

    if (!byPickOrder) {
      const ranked = [...stage.countries]
        .sort(createCountriesComparator(stage.runningOrder))
        .map((country) => country.code);

      placeOf = (qualifier, index) => {
        const rank = ranked.indexOf(qualifier.code);

        return rank === -1 ? index : rank;
      };
    }

    const groups = groupQualifiersBySection(sections, qualifiers, placeOf);

    return sections.map((section, index) => ({
      ...section,
      qualifiers: groups[index],
    }));
  }, [stage, qualifiers, byPickOrder, eventStages]);
};
