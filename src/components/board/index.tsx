import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import FlipMove from 'react-flip-move';

import { ANIMATION_DURATION, POINTS_ARRAY } from '../../data/data';
import { useGetCountries } from '../../hooks/useGetCountries';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';

import BoardHeader from './BoardHeader';
import CountryItem from './CountryItem';

const MAX_COUNTRY_WITH_POINTS = POINTS_ARRAY.length;

type Props = {
  countries: Country[];
  isJuryVoting: boolean;
  winnerCountry: Country | null;
  votingPoints: number;
  votingCountryIndex: number;
  shouldShowLastPoints: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const Board = ({
  countries,
  isJuryVoting,
  winnerCountry,
  votingPoints,
  votingCountryIndex,
  shouldShowLastPoints,
  dispatch,
}: Props): JSX.Element => {
  const timerId = useRef<NodeJS.Timeout | null>(null);
  const allCountries = useGetCountries();

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
    dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
  }, [dispatch]);

  const onClick = useCallback(
    (countryCode: string) => {
      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS) {
        handleResetPoints();
      }

      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS - 1) {
        timerId.current = setTimeout(handleResetPoints, ANIMATION_DURATION);
      }

      dispatch({
        type: ScoreboardActionKind.GIVE_JURY_POINTS,
        payload: { countryCode },
      });
    },
    [countriesWithPointsLength, dispatch, handleResetPoints],
  );

  const renderItem = useCallback(
    (country: Country) => (
      <CountryItem
        key={country.code}
        country={country}
        isJuryVoting={isJuryVoting}
        hasCountryFinishedVoting={hasCountryFinishedVoting}
        isVotingCountry={country.code === votingCountry?.code && isJuryVoting}
        isActive={country.code === votingCountry?.code && !isJuryVoting}
        onClick={onClick}
      />
    ),
    [hasCountryFinishedVoting, votingCountry, isJuryVoting, onClick],
  );

  useEffect(() => {
    if (!shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className={`${winnerCountry ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader
        isJuryVoting={isJuryVoting}
        votingPoints={votingPoints}
        countries={sortedCountries}
        votingCountry={votingCountry}
        winnerCountry={winnerCountry}
        dispatch={dispatch}
        onClick={onClick}
      />
      <div className="container-wrapping-flip-move">
        <FlipMove duration={500} delay={flipMoveDelay}>
          {sortedCountries.map(renderItem)}
        </FlipMove>
      </div>
    </div>
  );
};

export default React.memo(Board);
