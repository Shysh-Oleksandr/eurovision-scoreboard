import React, { useCallback } from 'react';

import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';
import Button from '../Button';

type Props = {
  countries: Country[];
  isJuryVoting: boolean;
  votingPoints: number;
  votingCountry: Country;
  onClick: (countryCode: string) => void;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const BoardHeader = ({
  countries,
  isJuryVoting,
  votingPoints,
  votingCountry,
  onClick,
  dispatch,
}: Props): JSX.Element => {
  const chooseRandomly = useCallback(() => {
    if (!isJuryVoting) {
      // TODO: change logic depending on the index
      const randomNumber = Math.random();
      const isBigNumber = randomNumber > 0.8;
      const isHugeNumber = randomNumber > 0.95;
      const isSmallNumber = randomNumber < 0.2;

      const bigRandomNumber = Math.random() * (isHugeNumber ? 450 : 220);
      const smallRandomNumber = Math.random() * 30;
      const randomCoefficient = isBigNumber ? bigRandomNumber : randomNumber;

      const randomVotingPoints = Math.round(
        isSmallNumber ? smallRandomNumber : randomCoefficient,
      );

      dispatch({
        type: ScoreboardActionKind.GIVE_TELEVOTE_POINTS,
        payload: {
          countryCode: votingCountry.code,
          votingPoints: randomVotingPoints,
        },
      });

      return;
    }

    const countriesWithoutPoints = countries.filter(
      (country) => !country.lastReceivedPoints,
    );

    const randomCountryIndex = Math.floor(
      Math.random() * countriesWithoutPoints.length,
    );
    const randomCountryCode = countriesWithoutPoints[randomCountryIndex].code;

    onClick(randomCountryCode);
  }, [countries, votingCountry.code, isJuryVoting, dispatch, onClick]);

  return (
    <div className="pb-2 flex flex-row w-full justify-between items-center">
      <h3 className="text-2xl text-white">
        {isJuryVoting
          ? `Choose a country to give ${votingPoints} point${
              votingPoints === 1 ? '' : 's'
            }`
          : `Enter televote points for ${votingCountry.name}`}
      </h3>
      <Button label="Choose randomly" onClick={chooseRandomly} />
    </div>
  );
};

export default BoardHeader;
