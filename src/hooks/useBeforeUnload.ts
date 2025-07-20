import { useEffect } from 'react';

import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const useBeforeUnload = () => {
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const shouldShowBeforeUnloadWarning = useGeneralStore(
    (state) => state.shouldShowBeforeUnloadWarning,
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        eventStages.length > 0 &&
        !winnerCountry &&
        shouldShowBeforeUnloadWarning
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [eventStages.length, winnerCountry, shouldShowBeforeUnloadWarning]);
};
