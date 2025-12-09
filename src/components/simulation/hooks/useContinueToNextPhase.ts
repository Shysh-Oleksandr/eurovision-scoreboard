import { useMemo } from 'react';

import { useCountriesStore } from '@/state/countriesStore';
import { StageVotes } from '@/state/scoreboard/types';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const useContinueToNextPhase = () => {
  const setPredefModalOpen = useCountriesStore(
    (state) => state.setPredefModalOpen,
  );
  const setPostSetupModalOpen = useCountriesStore(
    (state) => state.setPostSetupModalOpen,
  );
  const setCurrentSetupStageType = useCountriesStore(
    (state) => state.setCurrentSetupStageType,
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

  const nextSetupStage = useMemo(() => {
    const current = getCurrentStage();
    if (!current) return undefined;
    const currentIndex = eventStages.findIndex((s) => s.id === current.id);

    return eventStages[currentIndex + 1];
  }, [eventStages, getCurrentStage]);

  const handleContinue = () => {
    setCurrentSetupStageType('next');

    if (nextSetupStage && !nextSetupStage.isPreparedForNextStage) {
      prepareForNextStage();
    }

    setPostSetupModalOpen(true);
  };

  const onSaveContinue = (votes: Partial<StageVotes>) => {
    if (nextSetupStage) {
      setPredefinedVotesForStage(nextSetupStage, votes);
    }
    setPredefModalOpen(false);
    continueToNextPhase();
  };

  return {
    handleContinue,
    nextSetupStage,
    onSaveContinue,
  };
};
