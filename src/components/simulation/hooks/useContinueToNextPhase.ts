import { useMemo } from 'react';

import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { StageVotes } from '@/state/scoreboard/types';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const useContinueToNextPhase = () => {
  const setPredefModalOpen = useCountriesStore(
    (state) => state.setPredefModalOpen,
  );
  const setPredefModalStageType = useCountriesStore(
    (state) => state.setPredefModalStageType,
  );
  const continueToNextPhase = useScoreboardStore(
    (state) => state.continueToNextPhase,
  );

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const eventStages = useScoreboardStore((state) => state.eventStages);

  const prepareForNextStage = useScoreboardStore(
    (state) => state.prepareForNextStage,
  );
  const setPredefinedVotesForStage = useScoreboardStore(
    (state) => state.setPredefinedVotesForStage,
  );

  const enablePredefinedVotes = useGeneralStore(
    (s) => s.settings.enablePredefinedVotes,
  );

  const nextStageForPredef = useMemo(() => {
    const current = getCurrentStage();
    const currentIndex = eventStages.findIndex((s) => s.id === current.id);

    return eventStages[currentIndex + 1];
  }, [eventStages, getCurrentStage]);

  const handleContinue = () => {
    if (enablePredefinedVotes && nextStageForPredef) {
      if (!nextStageForPredef.isReadyForPredef) prepareForNextStage();
      setPredefModalStageType('next');
      setPredefModalOpen(true);

      return;
    }

    continueToNextPhase();
  };

  const onSaveContinue = (votes: Partial<StageVotes>) => {
    setPredefinedVotesForStage(nextStageForPredef, votes);
    setPredefModalOpen(false);
    continueToNextPhase();
  };

  return {
    handleContinue,
    nextStageForPredef,
    onSaveContinue,
  };
};
