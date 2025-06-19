import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import FlipMove from 'react-flip-move';

import { ANIMATION_DURATION, POINTS_ARRAY } from '../../data/data';
import { Country } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';

import BoardHeader from './BoardHeader';
import CountryItem from './CountryItem';

const MAX_COUNTRY_WITH_POINTS = POINTS_ARRAY.length;

const Board = (): JSX.Element => {
  const {
    countries,
    isJuryVoting,
    winnerCountry,
    votingPoints,
    votingCountryIndex,
    shouldShowLastPoints,
    resetLastPoints,
    giveJuryPoints,
  } = useScoreboardStore();

  const timerId = useRef<NodeJS.Timeout | null>(null);
  const { allCountries } = useCountriesStore();

  const isVotingOver = !!winnerCountry;

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => b.points - a.points),
    [countries],
  );

  const countriesWithPointsLength = useMemo(
    () =>
      countries.filter((country) => country.lastReceivedPoints !== null).length,
    [countries],
  );

  const votingCountry = useMemo(() => {
    if (isJuryVoting) return allCountries[votingCountryIndex] as Country;

    return countries[votingCountryIndex] as Country;
  }, [allCountries, countries, isJuryVoting, votingCountryIndex]);

  const hasCountryFinishedVoting = useMemo(
    () => countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS,
    [countriesWithPointsLength],
  );

  const flipMoveDelay = useMemo(() => {
    if (votingCountryIndex === 0 && votingPoints === 1) return 0;

    return hasCountryFinishedVoting ? 1000 : 500;
  }, [hasCountryFinishedVoting, votingCountryIndex, votingPoints]);

  const handleResetPoints = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    resetLastPoints();
  }, [resetLastPoints]);

  const onClick = useCallback(
    (countryCode: string) => {
      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS) {
        handleResetPoints();
      }

      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS - 1) {
        timerId.current = setTimeout(handleResetPoints, ANIMATION_DURATION);
      }

      giveJuryPoints(countryCode);
    },
    [countriesWithPointsLength, giveJuryPoints, handleResetPoints],
  );

  const renderItem = useCallback(
    (country: Country, index: number) => (
      <CountryItem
        key={country.code}
        country={country}
        isJuryVoting={isJuryVoting}
        hasCountryFinishedVoting={hasCountryFinishedVoting}
        isVotingCountry={country.code === votingCountry?.code && isJuryVoting}
        isActive={country.code === votingCountry?.code && !isJuryVoting}
        onClick={onClick}
        isVotingOver={isVotingOver}
        index={index}
      />
    ),
    [
      hasCountryFinishedVoting,
      votingCountry,
      isJuryVoting,
      onClick,
      isVotingOver,
    ],
  );

  useEffect(() => {
    if (!shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className={`${winnerCountry ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader onClick={onClick} />
      <div className="container-wrapping-flip-move">
        <FlipMove
          duration={500}
          delay={flipMoveDelay}
          appearAnimation={{
            from: { opacity: '0', transform: 'translateY(10px)' },
            to: { opacity: '1', transform: 'translateY(0)' },
          }}
          enterAnimation={{
            from: { opacity: '0', transform: 'translateY(10px)' },
            to: { opacity: '1', transform: 'translateY(0)' },
          }}
          leaveAnimation={{
            from: { opacity: '1', transform: 'translateY(0)' },
            to: { opacity: '0', transform: 'translateY(10px)' },
          }}
        >
          {sortedCountries.map(renderItem)}
        </FlipMove>
      </div>
    </div>
  );
};

export default React.memo(Board);
