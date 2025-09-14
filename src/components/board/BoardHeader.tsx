import React, { useMemo, type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import { getWinnerCountry } from '@/state/scoreboard/helpers';

const BoardHeader = (): JSX.Element | null => {
  const {
    getCurrentStage,
    winnerCountry,
    viewedStageId,
    eventStages,
    currentRevealTelevotePoints,
    votingPoints,
    givePredefinedJuryPoint,
    givePredefinedTelevotePoints,
  } = useScoreboardStore(
    useShallow((state) => ({
      getCurrentStage: state.getCurrentStage,
      winnerCountry: state.winnerCountry,
      viewedStageId: state.viewedStageId,
      eventStages: state.eventStages,
      currentRevealTelevotePoints: state.currentRevealTelevotePoints,
      votingPoints: state.getVotingPoints(),
      givePredefinedJuryPoint: state.givePredefinedJuryPoint,
      givePredefinedTelevotePoints: state.givePredefinedTelevotePoints,
    })),
  );
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );

  const viewedStage = eventStages.find((s) => s.id === viewedStageId);
  const winnerCountryFromStage = getWinnerCountry(viewedStage?.countries ?? []);

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const {
    isJuryVoting,
    isOver: isVotingOver,
    id: currentStageId,
  } = getCurrentStage();

  const votingCountry = getVotingCountry();

  const isAnotherStageDisplayed = currentStageId !== viewedStageId;

  const votingText = useMemo(() => {
    if (isVotingOver) return null;

    if (revealTelevoteLowestToHighest && !isJuryVoting) {
      const pointsToShow = currentRevealTelevotePoints;

      return (
        <>
          <span className="font-medium">
            {pointsToShow} point{pointsToShow === 1 ? '' : 's'}
          </span>{' '}
          go to...
        </>
      );
    }

    if (isJuryVoting) {
      return (
        <>
          Choose a country to give{' '}
          <span className="font-medium">{votingPoints}</span> point
          {votingPoints === 1 ? '' : 's'}
        </>
      );
    }

    return (
      <>
        Enter televote points for{' '}
        <span className="font-medium">{votingCountry?.name}</span>
      </>
    );
  }, [
    isVotingOver,
    revealTelevoteLowestToHighest,
    isJuryVoting,
    votingCountry?.name,
    votingPoints,
    currentRevealTelevotePoints,
  ]);

  const winnerText = useMemo(() => {
    if (!winnerCountry) return null;

    if (isAnotherStageDisplayed && winnerCountryFromStage) {
      return (
        <>
          <span className="font-semibold">{winnerCountryFromStage.name}</span>{' '}
          is the winner of{' '}
          <span className="font-medium">{viewedStage?.name}</span>!
        </>
      );
    }

    return (
      <>
        <span className="font-semibold">{winnerCountry.name}</span> is the
        winner of{' '}
        <span className="font-medium">
          {contestName || 'Eurovision'} {contestYear || ''}
        </span>
        !
      </>
    );
  }, [
    winnerCountry,
    isAnotherStageDisplayed,
    winnerCountryFromStage,
    contestYear,
    contestName,
    viewedStage?.name,
  ]);

  const chooseRandomly = () => {
    if (isJuryVoting) {
      givePredefinedJuryPoint();
    } else {
      givePredefinedTelevotePoints();
    }
  };

  const hasContent = winnerCountry || !isVotingOver;

  return (
    <div
      className={`flex flex-row w-full justify-between items-center ${
        hasContent ? 'md:h-12 pb-2' : ''
      }`}
    >
      <h3
        className="lg:text-2xl xs:text-xl text-lg text-white"
        style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
      >
        {winnerText || votingText}
      </h3>
      {!isVotingOver && (
        <Button variant="tertiary" label="Random" onClick={chooseRandomly} />
      )}
    </div>
  );
};

export default BoardHeader;
