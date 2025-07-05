import React from 'react';

import { useNextEventName } from '../../hooks/useNextEventName';
import { EventMode, EventPhase } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';

export const PhaseActions = () => {
  const {
    eventPhase,
    eventMode,
    continueToNextPhase,
    qualifiedCountries,
    winnerCountry,
    showAllParticipants,
    toggleShowAllParticipants,
  } = useScoreboardStore();

  const { nextPhase } = useNextEventName();

  const isVotingOver = qualifiedCountries.length > 0;
  const hasWinner = !!winnerCountry;

  const canShowAllParticipants =
    eventPhase === EventPhase.GRAND_FINAL &&
    hasWinner &&
    eventMode === EventMode.SEMI_FINALS_AND_GRAND_FINAL;

  if (!isVotingOver && !canShowAllParticipants) {
    return null;
  }

  return (
    <div className="flex justify-end mb-2">
      {isVotingOver && (
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
