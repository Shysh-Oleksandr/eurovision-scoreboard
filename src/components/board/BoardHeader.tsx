import React, { useCallback, useMemo } from 'react';

import { POINTS_ARRAY } from '../../data/data';
import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';

type Props = {
  onClick: (countryCode: string) => void;
};

const BoardHeader = ({ onClick }: Props): JSX.Element => {
  const {
    countries,
    isJuryVoting,
    votingPoints,
    winnerCountry,
    qualifiedCountries,
    resetLastPoints,
    giveTelevotePoints,
  } = useScoreboardStore();

  const {
    year,
    getQualifiedCountries,
    getVotingCountriesLength,
    getVotingCountry,
  } = useCountriesStore();

  const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

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

      const randomVotingPoints = getRandomTelevotePoints(
        votingCountryPlace,
        getQualifiedCountries().length,
        getVotingCountriesLength(),
      );

      giveTelevotePoints(votingCountry?.code, randomVotingPoints);

      return;
    }

    const initialCountriesWithPointsLength = countries.filter(
      (country) => country.lastReceivedPoints !== null,
    ).length;

    const availableCountries = countries.filter(
      (country) =>
        country.code !== votingCountry?.code &&
        (country.lastReceivedPoints === null ||
          initialCountriesWithPointsLength >= POINTS_ARRAY.length),
    );

    if (availableCountries.length === 0) {
      return;
    }

    const randomCountryIndex = Math.floor(
      Math.random() * availableCountries.length,
    );
    const randomCountryCode = availableCountries[randomCountryIndex].code;

    onClick(randomCountryCode);
  }, [
    countries,
    votingCountry?.code,
    isJuryVoting,
    resetLastPoints,
    giveTelevotePoints,
    onClick,
    getQualifiedCountries,
    getVotingCountriesLength,
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
      {!isVotingOver && (
        <Button label="Choose randomly" onClick={chooseRandomly} />
      )}
    </div>
  );
};

export default BoardHeader;
