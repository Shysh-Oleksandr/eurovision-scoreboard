import React, { useCallback } from 'react';

import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../Button';

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
  const { year } = useTheme();

  const votingText = isJuryVoting ? (
    <>
      Choose a country to give{' '}
      <span className="font-medium">{votingPoints}</span> point
      {votingPoints === 1 ? '' : 's'}
    </>
  ) : (
    <>
      Enter televote points for{' '}
      <span className="font-medium">{votingCountry?.name}</span>
    </>
  );

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
      (country) => country.lastReceivedPoints === null,
    );

    const randomCountryIndex = Math.floor(
      Math.random() * countriesWithoutPoints.length,
    );
    const randomCountryCode = countriesWithoutPoints[randomCountryIndex].code;

    onClick(randomCountryCode);
  }, [countries, votingCountry?.code, isJuryVoting, dispatch, onClick]);

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
      {!winnerCountry && (
        <Button label="Choose randomly" onClick={chooseRandomly} />
      )}
    </div>
  );
};

export default BoardHeader;
