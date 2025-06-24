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
    winnerCountry,
    shouldShowLastPoints,
    qualifiedCountries,
    resetLastPoints,
    giveJuryPoints,
    eventPhase,
    restartCounter,
    showAllParticipants,
  } = useScoreboardStore();

  const timerId = useRef<NodeJS.Timeout | null>(null);
  const { getVotingCountry, selectedCountries, getSemiFinalPoints } =
    useCountriesStore();

  const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

  // Get all countries to display when showAllParticipants is true
  // TODO: move outside
  const allCountriesToDisplay = useMemo(() => {
    if (!showAllParticipants || !winnerCountry) {
      return countries;
    }

    const allEventParticipants = selectedCountries.map((country) => {
      // Find if this country already has points from the current voting
      const existingCountry = countries.find((c) => c.code === country.code);

      return {
        ...country,
        points: existingCountry?.points ?? -1,
        lastReceivedPoints: existingCountry?.lastReceivedPoints ?? 0,
        isVotingFinished: existingCountry?.isVotingFinished ?? true,
      };
    });

    return allEventParticipants;
  }, [countries, showAllParticipants, winnerCountry, selectedCountries]);

  const sortedCountries = useMemo(() => {
    const countriesToSort = [...allCountriesToDisplay];

    if (showAllParticipants && winnerCountry) {
      // When showing all participants, sort grand-finalists by grand final points
      // and non-qualifiers by their semi-final points
      return countriesToSort.sort((a, b) => {
        // If both countries have grand final points, sort by grand final points
        if (a.points >= 0 && b.points >= 0) {
          return b.points - a.points;
        }

        // If one has grand final points and the other doesn't, grand finalist comes first
        if (a.points >= 0 && b.points === -1) {
          return -1;
        }
        if (a.points === -1 && b.points >= 0) {
          return 1;
        }

        // If both are non-qualifiers, sort by semi-final points
        const aSemiPoints = getSemiFinalPoints(a.code);
        const bSemiPoints = getSemiFinalPoints(b.code);

        return bSemiPoints - aSemiPoints;
      });
    }

    // Default sorting by points
    return countriesToSort.sort((a, b) => b.points - a.points);
  }, [
    allCountriesToDisplay,
    showAllParticipants,
    winnerCountry,
    getSemiFinalPoints,
  ]);

  const countriesWithPointsLength = useMemo(
    () =>
      countries.filter((country) => country.lastReceivedPoints !== null).length,
    [countries],
  );
  const wasTheFirstPointsAwarded = useMemo(
    () => countries.some((country) => country.points > 0),
    [countries],
  );

  const votingCountry = getVotingCountry();
  const hasCountryFinishedVoting = useMemo(
    () => countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS,
    [countriesWithPointsLength],
  );

  const flipMoveDelay = useMemo(() => {
    if (!wasTheFirstPointsAwarded) return 0;

    return hasCountryFinishedVoting ? 1000 : 500;
  }, [hasCountryFinishedVoting, wasTheFirstPointsAwarded]);

  const handleResetPoints = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    resetLastPoints();
  }, [resetLastPoints]);

  const onClick = useCallback(
    (countryCode: string) => {
      if (countriesWithPointsLength >= MAX_COUNTRY_WITH_POINTS) {
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
        votingCountryCode={votingCountry?.code}
        onClick={onClick}
        index={index}
      />
    ),
    [votingCountry?.code, onClick],
  );

  useEffect(() => {
    if (!shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className={`${isVotingOver ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader onClick={onClick} />
      <div
        className={`container-wrapping-flip-move ${
          showAllParticipants ? 'show-all-participants' : ''
        }`}
      >
        <FlipMove
          key={`${eventPhase}-${restartCounter}-${showAllParticipants}`}
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
