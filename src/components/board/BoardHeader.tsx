import React, { useMemo, type JSX } from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import { getWinnerCountry } from '@/state/scoreboard/helpers';

const BoardHeader = (): JSX.Element => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const votingPoints = useScoreboardStore((state) => state.getVotingPoints());
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const givePredefinedJuryPoint = useScoreboardStore(
    (state) => state.givePredefinedJuryPoint,
  );
  const givePredefinedTelevotePoints = useScoreboardStore(
    (state) => state.givePredefinedTelevotePoints,
  );
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const eventStages = useScoreboardStore((state) => state.eventStages);

  const viewedStage = eventStages.find((s) => s.id === viewedStageId);
  const winnerCountryFromStage = getWinnerCountry(viewedStage?.countries ?? []);

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const year = useGeneralStore((state) => state.year);

  const {
    isJuryVoting,
    isOver: isVotingOver,
    id: currentStageId,
  } = getCurrentStage();

  const votingCountry = getVotingCountry();

  const isAnotherStageDisplayed = currentStageId !== viewedStageId;

  const votingText = useMemo(() => {
    if (isVotingOver) return null;

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
  }, [isVotingOver, isJuryVoting, votingPoints, votingCountry]);

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
        winner of <span className="font-medium">Eurovision {year}</span>!
      </>
    );
  }, [
    winnerCountry,
    isAnotherStageDisplayed,
    winnerCountryFromStage,
    year,
    viewedStage?.name,
  ]);

  const chooseRandomly = () => {
    if (isJuryVoting) {
      // resetPoints();
      givePredefinedJuryPoint();
    } else {
      givePredefinedTelevotePoints();
    }
  };

  const hasContent = winnerCountry || !isVotingOver;

  return (
    <div
      className={`pb-2 flex flex-row w-full justify-between items-center ${
        hasContent ? 'md:h-12' : ''
      }`}
    >
      <h3 className="lg:text-2xl xs:text-xl text-lg text-white">
        {winnerText || votingText}
      </h3>
      {!isVotingOver && (
        <Button variant="tertiary" label="Random" onClick={chooseRandomly} />
      )}
    </div>
  );
};

export default BoardHeader;
