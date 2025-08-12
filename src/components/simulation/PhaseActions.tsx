import React, { useEffect, useState } from 'react';

import { useNextEventName } from '../../hooks/useNextEventName';
import { EventMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Select from '../common/Select';

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
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const setViewedStageId = useScoreboardStore(
    (state) => state.setViewedStageId,
  );

  const [showFinalStatsModal, setShowFinalStatsModal] = useState(false);

  const { nextPhase } = useNextEventName();

  const {
    isOver: isVotingOver,
    isLastStage,
    id: currentStageId,
  } = getCurrentStage();

  const viewedStage =
    eventStages.find((s) => s.id === viewedStageId) || getCurrentStage();

  const isAnotherStageDisplayed = viewedStageId !== currentStageId;

  const hasWinner = !!winnerCountry;

  const isSFAndGFEventOver =
    eventStages.length > 1 &&
    isVotingOver &&
    isLastStage &&
    hasWinner &&
    eventMode === EventMode.SEMI_FINALS_AND_GRAND_FINAL;

  useEffect(() => {
    if (isSFAndGFEventOver && !viewedStageId) {
      setViewedStageId(getCurrentStage().id);
    }
  }, [isSFAndGFEventOver, getCurrentStage, setViewedStageId, viewedStageId]);

  if (!isVotingOver && !isSFAndGFEventOver) {
    return null;
  }

  return (
    <>
      <FinalStatsModal
        isOpen={showFinalStatsModal}
        onClose={() => setShowFinalStatsModal(false)}
      />

      <div className="flex pb-2 gap-2 min-h-12 whitespace-nowrap w-full overflow-x-auto sm:overflow-x-visible">
        {isVotingOver && (
          <Button
            variant="tertiary"
            className="ml-auto"
            onClick={() => setShowFinalStatsModal(true)}
          >
            View Stats
          </Button>
        )}

        {isSFAndGFEventOver && !isAnotherStageDisplayed && (
          <Button onClick={toggleShowAllParticipants}>
            {showAllParticipants ? 'Grand finalists only' : 'All participants'}
          </Button>
        )}
        {isSFAndGFEventOver && (
          <Select
            id="eventStage"
            value={viewedStage.id}
            onChange={(e) => {
              if (showAllParticipants) {
                toggleShowAllParticipants();
              }
              setViewedStageId(
                eventStages.find((stage) => stage.id === e.target.value)!.id,
              );
            }}
            aria-label="Select event stage"
            options={eventStages.map((stage) => ({
              value: stage.id,
              label: stage.name,
            }))}
            className="py-2.5 sm:px-4 px-3 sm:min-w-[150px] font-medium bg-primary-800 bg-gradient-to-bl from-[20%] from-primary-900 to-primary-800/60 lg:text-base text-sm hover:bg-primary-700"
            selectClassName="select"
            arrowClassName="!w-6 !h-6"
          >
            <span className="flex-1">{viewedStage.name}</span>
          </Select>
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
