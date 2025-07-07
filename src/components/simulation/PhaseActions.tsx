import React from 'react';

import { useNextEventName } from '../../hooks/useNextEventName';
import { EventMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

export const PhaseActions = () => {
  const {
    eventMode,
    continueToNextPhase,
    winnerCountry,
    showAllParticipants,
    getCurrentStage,
    toggleShowAllParticipants,
  } = useScoreboardStore();

  const { nextPhase } = useNextEventName();

  const { isOver: isVotingOver, isLastStage } = getCurrentStage();

  const hasWinner = !!winnerCountry;

  const canShowAllParticipants =
    isVotingOver &&
    isLastStage &&
    hasWinner &&
    eventMode === EventMode.SEMI_FINALS_AND_GRAND_FINAL;

  if (!isVotingOver && !canShowAllParticipants) {
    return null;
  }

  return (
    <div className="flex justify-end mb-2">
      {isVotingOver && !isLastStage && (
        <Button onClick={continueToNextPhase} className="animated-border">
          Continue to {nextPhase}
        </Button>
      )}
      {canShowAllParticipants && (
        <Button onClick={toggleShowAllParticipants} className="ml-2">
          {showAllParticipants
            ? 'Show grand finalists only'
            : 'Show all participants'}
        </Button>
      )}
    </div>
  );
};
