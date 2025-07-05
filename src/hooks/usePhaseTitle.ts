import { useMemo } from 'react';

import { EventPhase } from '../models';
import { useGeneralStore } from '../state/generalStore';
import { useScoreboardStore } from '../state/scoreboardStore';

import { useNextEventName } from './useNextEventName';

export const usePhaseTitle = () => {
  const { year } = useGeneralStore();
  const { eventPhase } = useScoreboardStore();
  const { hasOneSemiFinal } = useNextEventName();

  const phaseTitle = useMemo(() => {
    switch (eventPhase) {
      case EventPhase.SEMI_FINAL_1:
        return `Semi-Final ${hasOneSemiFinal ? '' : '1'} - ${year}`;
      case EventPhase.SEMI_FINAL_2:
        return `Semi-Final 2 - ${year}`;
      case EventPhase.GRAND_FINAL:
        return `Grand Final - ${year}`;
      default:
        return `Eurovision ${year}`;
    }
  }, [eventPhase, hasOneSemiFinal, year]);

  return phaseTitle;
};
