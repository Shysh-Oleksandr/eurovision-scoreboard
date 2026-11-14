import { useEffect } from 'react';

import { useShallow } from 'zustand/shallow';

import { useContinueToNextPhase } from '../hooks/useContinueToNextPhase';

import { useNextEventName } from '@/hooks/useNextEventName';
import { getWinnerCountry } from '@/state/scoreboard/helpers';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * What the results state offers once a stage is over (the column layout's
 * counterpart of `PhaseActions`): the winner of the viewed stage, the stage
 * select and the non-qualifiers toggle after the final, and Continue.
 */
export const usePhaseResults = () => {
  const {
    winnerCountry,
    showAllParticipants,
    eventStages,
    viewedStageId,
    currentStage,
  } = useScoreboardStore(
    useShallow((state) => ({
      winnerCountry: state.winnerCountry,
      showAllParticipants: state.showAllParticipants,
      eventStages: state.eventStages,
      viewedStageId: state.viewedStageId,
      currentStage: state.getCurrentStage(),
    })),
  );
  const toggleShowAllParticipants = useScoreboardStore(
    (state) => state.toggleShowAllParticipants,
  );
  const setViewedStageId = useScoreboardStore(
    (state) => state.setViewedStageId,
  );

  const { nextPhase } = useNextEventName();
  const { handleContinue } = useContinueToNextPhase();

  const isVotingOver = !!currentStage?.isOver;
  const isLastStage = !!currentStage?.isLastStage;
  const currentStageId = currentStage?.id;

  const viewedStage =
    eventStages.find((s) => s.id === viewedStageId) || currentStage;
  const isAnotherStageDisplayed =
    !!viewedStageId && viewedStageId !== currentStageId;

  const isEventOver =
    eventStages.length > 1 && isVotingOver && isLastStage && !!winnerCountry;

  // Same as PhaseActions: once the whole event is over, the select starts on
  // the final.
  useEffect(() => {
    if (isEventOver && !viewedStageId) {
      setViewedStageId(currentStageId ?? '');
    }
  }, [isEventOver, viewedStageId, currentStageId, setViewedStageId]);

  const viewedWinner =
    isAnotherStageDisplayed && viewedStage
      ? getWinnerCountry(viewedStage.countries ?? [], viewedStage.runningOrder)
      : winnerCountry;

  const selectStage = (stageId: string) => {
    if (showAllParticipants) toggleShowAllParticipants();

    setViewedStageId(stageId);
  };

  return {
    isVotingOver,
    isLastStage,
    viewedStage,
    /** The final's (or the viewed stage's) winner; null before the final. */
    winner: isLastStage || isAnotherStageDisplayed ? viewedWinner : null,
    eventStages,
    showStageSelect: isEventOver,
    showNonQualifiersToggle: isEventOver && !isAnotherStageDisplayed,
    showAllParticipants,
    toggleShowAllParticipants,
    selectStage,
    canContinue: isVotingOver && !isLastStage,
    nextPhase,
    handleContinue,
  };
};
