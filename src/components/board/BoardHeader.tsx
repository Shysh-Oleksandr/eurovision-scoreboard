import React, { useMemo, type JSX } from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

type Props = {
  resetPoints: () => void;
};

const BoardHeader = ({ resetPoints }: Props): JSX.Element => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const votingPoints = useScoreboardStore((state) => state.votingPoints);
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const givePredefinedJuryPoint = useScoreboardStore(
    (state) => state.givePredefinedJuryPoint,
  );
  const givePredefinedTelevotePoints = useScoreboardStore(
    (state) => state.givePredefinedTelevotePoints,
  );

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const year = useGeneralStore((state) => state.year);

  const { isJuryVoting, isOver: isVotingOver } = getCurrentStage();

  const votingCountry = getVotingCountry();

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

  const chooseRandomly = () => {
    if (isJuryVoting) {
      resetPoints();
      givePredefinedJuryPoint();
    } else {
      givePredefinedTelevotePoints();
    }
  };

  return (
    <div className="pb-2 flex flex-row w-full justify-between items-center">
      <h3 className="lg:text-2xl xs:text-xl text-lg text-white">
        {winnerCountry ? (
          <>
            <span className="font-semibold">{winnerCountry.name}</span> is the
            winner of Eurovision {year}!
          </>
        ) : (
          votingText
        )}
      </h3>
      {!isVotingOver && (
        <Button variant="tertiary" label="Random" onClick={chooseRandomly} />
      )}
    </div>
  );
};

export default BoardHeader;
