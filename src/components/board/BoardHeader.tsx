import React, { useCallback } from 'react';

import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';
import Button from '../Button';
import StartOverButton from '../StartOverButton';

type Props = {
  countries: Country[];
  isJuryVoting: boolean;
  votingPoints: number;
  votingCountry: Country;
  winnerCountry: Country | null;
  onClick: (countryCode: string) => void;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const BoardHeader = ({
  countries,
  isJuryVoting,
  votingPoints,
  votingCountry,
  winnerCountry,
  onClick,
  dispatch,
}: Props): JSX.Element => {
  const votingText = isJuryVoting
    ? `Choose a country to give ${votingPoints} point${
        votingPoints === 1 ? '' : 's'
      }`
    : `Enter televote points for ${votingCountry?.name}`;

  const chooseRandomly = useCallback(() => {
    if (!isJuryVoting) {
      const isFirstTelevoteCountry =
        countries.filter((country) => country.isVotingFinished).length === 0;

      if (isFirstTelevoteCountry) {
        dispatch({
          type: ScoreboardActionKind.RESET_LAST_POINTS,
        });
      }

      const votingCountryPlace =
        countries.findIndex((country) => country.code === votingCountry.code) +
        1;

      const randomVotingPoints = getRandomTelevotePoints(votingCountryPlace);

      dispatch({
        type: ScoreboardActionKind.GIVE_TELEVOTE_POINTS,
        payload: {
          countryCode: votingCountry?.code,
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
  }, [countries, votingCountry?.code, isJuryVoting, dispatch, onClick]);

  return (
    <div className="pb-2 flex flex-row w-full justify-between items-center">
      <h3 className="text-2xl text-white">
        {winnerCountry
          ? `${winnerCountry.name} is the winner of Eurovision!`
          : votingText}
      </h3>
      {winnerCountry ? (
        <StartOverButton dispatch={dispatch} className="w-1/4" />
      ) : (
        <Button label="Choose randomly" onClick={chooseRandomly} />
      )}
    </div>
  );
};

export default BoardHeader;
