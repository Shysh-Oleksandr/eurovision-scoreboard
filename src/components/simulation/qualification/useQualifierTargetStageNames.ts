import { useMemo } from 'react';

import { buildQualifierTargetStageNameMap } from '@/helpers/qualifierTargetResolution';
import { EventStage } from '@/models';
import { createCountriesComparator } from '@/state/scoreboard/helpers';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const useQualifierTargetStageNames = (
  stage: EventStage | undefined,
  qualifiedCountryCodes: string[],
): Map<string, string> => {
  const eventStages = useScoreboardStore((state) => state.eventStages);

  return useMemo(() => {
    if (!stage?.qualifiesTo?.length || !stage.countries?.length) {
      return new Map<string, string>();
    }

    const rankedCountryCodes = [...stage.countries]
      .sort(createCountriesComparator(stage.runningOrder))
      .map((country) => country.code);

    return buildQualifierTargetStageNameMap(
      qualifiedCountryCodes,
      stage.qualifiesTo,
      rankedCountryCodes,
      eventStages,
    );
  }, [stage, qualifiedCountryCodes, eventStages]);
};
