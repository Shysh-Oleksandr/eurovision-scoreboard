import React, { useState } from 'react';

import { useNextEventName } from '../../hooks/useNextEventName';
import { EventMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import FinalStatsModal from './FinalStatsModal';

export const PhaseActions = () => {
  const eventMode = useScoreboardStore((state) => state.eventMode);
  const continueToNextPhase = useScoreboardStore(
    (state) => state.continueToNextPhase,
  );
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const toggleShowAllParticipants = useScoreboardStore(
    (state) => state.toggleShowAllParticipants,
  );

  const [showFinalStatsModal, setShowFinalStatsModal] = useState(false);

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
    <>
      <FinalStatsModal
        isOpen={showFinalStatsModal}
        onClose={() => setShowFinalStatsModal(false)}
      />

      <div className="flex justify-end mb-2 gap-2">
        {isVotingOver && (
          <Button
            variant="tertiary"
            onClick={() => setShowFinalStatsModal(true)}
          >
            View Stats
          </Button>
        )}
        {canShowAllParticipants && (
          <Button onClick={toggleShowAllParticipants}>
            {showAllParticipants ? 'Grand finalists only' : 'All participants'}
          </Button>
        )}
        {isVotingOver && !isLastStage && (
          <Button onClick={continueToNextPhase} className="animated-border">
            Continue to {nextPhase}
          </Button>
        )}
      </div>
    </>
  );
};
