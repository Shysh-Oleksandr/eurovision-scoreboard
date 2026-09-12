import React, { useMemo } from 'react';

import { useGetCategoryLabel } from '../hooks/useGetCategoryLabel';

import { BaseCountry, CountryAssignmentGroup } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

interface VoterGroupLabelProps {
  country: BaseCountry;
  stageId: string;
  /** Render as a flex child of a badge row (truncates first) instead of self-positioning. */
  inline?: boolean;
}

export const VoterGroupLabel: React.FC<VoterGroupLabelProps> = ({
  country,
  stageId,
  inline = false,
}) => {
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const getCategoryLabel = useGetCategoryLabel();

  const label = useMemo(() => {
    const normalizedStageId = stageId.toLowerCase();
    const stage = eventStages.find(
      (s) => s.id.toLowerCase() === normalizedStageId,
    );

    const isAutoQ =
      country.aqSemiFinalGroup &&
      country.aqSemiFinalGroup.toLowerCase() === normalizedStageId;

    if (isAutoQ) return 'Auto-Q';

    const assignedGroup = eventAssignments[country.code];

    if (
      assignedGroup === stageId ||
      stage?.countries.some((c) => c.code === country.code)
    )
      return 'In stage';

    if (
      assignedGroup &&
      assignedGroup !== CountryAssignmentGroup.NOT_PARTICIPATING &&
      assignedGroup !== CountryAssignmentGroup.NOT_QUALIFIED
    ) {
      return 'Other stage';
    }

    return 'Not participating';
  }, [
    stageId,
    eventStages,
    country.aqSemiFinalGroup,
    country.code,
    eventAssignments,
  ]);

  if (inline) {
    return (
      <span
        className="flex-[0_1_auto] min-w-[26px] px-1 rounded-md bg-primary-700 text-[10px] leading-5 text-white whitespace-nowrap overflow-hidden text-ellipsis"
        title={getCategoryLabel(label)}
      >
        {getCategoryLabel(label)}
      </span>
    );
  }

  return (
    <div className="absolute -top-[8px] -left-1 px-1 rounded-md bg-primary-700 z-10">
      <span className="text-[10px] leading-5 text-white">
        {getCategoryLabel(label)}
      </span>
    </div>
  );
};
