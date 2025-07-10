import React, { useCallback, useMemo, type JSX } from 'react';

import { POINTS_ARRAY } from '../../data/data';
import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

type Props = {
  onClick: (countryCode: string) => void;
};

const BoardHeader = ({ onClick }: Props): JSX.Element => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const votingPoints = useScoreboardStore((state) => state.votingPoints);
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const resetLastPoints = useScoreboardStore((state) => state.resetLastPoints);
  const giveTelevotePoints = useScoreboardStore(
    (state) => state.giveTelevotePoints,
  );

  const getQualifiedCountries = useCountriesStore(
    (state) => state.getQualifiedCountries,
  );
  const getVotingCountriesLength = useCountriesStore(
    (state) => state.getVotingCountriesLength,
  );
  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const year = useGeneralStore((state) => state.year);

  const { isJuryVoting, countries, isOver: isVotingOver } = getCurrentStage();

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
      {!isVotingOver && <Button label="Random" onClick={chooseRandomly} />}
    </div>
  );
};

export default BoardHeader;
