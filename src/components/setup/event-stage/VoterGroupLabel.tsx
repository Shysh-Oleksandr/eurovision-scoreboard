import React, { useMemo } from 'react';

import { useGetCategoryLabel } from '../hooks/useGetCategoryLabel';

import { BaseCountry, CountryAssignmentGroup } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface VoterGroupLabelProps {
  country: BaseCountry;
  stageId: string;
}

export const VoterGroupLabel: React.FC<VoterGroupLabelProps> = ({
  country,
  stageId,
}) => {
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const getCategoryLabel = useGetCategoryLabel();

  const label = useMemo(() => {
    const normalizedStageId = stageId.toLowerCase();

    const isAutoQ =
      country.aqSemiFinalGroup &&
      country.aqSemiFinalGroup.toLowerCase() === normalizedStageId;

    if (isAutoQ) return 'Auto-Q';

    const assignedGroup = eventAssignments[country.code];

    if (assignedGroup === stageId) return 'In stage';

    if (
      assignedGroup &&
      assignedGroup !== CountryAssignmentGroup.NOT_PARTICIPATING &&
      assignedGroup !== CountryAssignmentGroup.NOT_QUALIFIED
    ) {
      return 'Other stage';
    }

    return 'Not participating';
  }, [country, stageId, eventAssignments]);

  return (
    <div className="absolute -top-[8px] -left-1 px-1 rounded-md bg-primary-700 z-10">
      <span className="text-[10px] leading-5 text-white">
        {getCategoryLabel(label)}
      </span>
    </div>
  );
};
