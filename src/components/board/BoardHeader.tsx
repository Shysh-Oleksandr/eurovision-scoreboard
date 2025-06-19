import React, { useCallback } from 'react';

import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { useGetCountries } from '../../hooks/useGetCountries';
import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../Button';

type Props = {
  onClick: (countryCode: string) => void;
};

const BoardHeader = ({ onClick }: Props): JSX.Element => {
  const {
    countries,
    isJuryVoting,
    votingPoints,
    votingCountryIndex,
    winnerCountry,
    resetLastPoints,
    giveTelevotePoints,
  } = useScoreboardStore();

  const allCountries = useGetCountries();
  const votingCountry = isJuryVoting
    ? (allCountries[votingCountryIndex] as Country)
    : (countries[votingCountryIndex] as Country);

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
        resetLastPoints();
      }

      const votingCountryPlace =
        countries.findIndex((country) => country.code === votingCountry.code) +
        1;

      const randomVotingPoints = getRandomTelevotePoints(votingCountryPlace);

      giveTelevotePoints(votingCountry?.code, randomVotingPoints);

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
  }, [
    countries,
    votingCountry?.code,
    isJuryVoting,
    resetLastPoints,
    giveTelevotePoints,
    onClick,
  ]);

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
