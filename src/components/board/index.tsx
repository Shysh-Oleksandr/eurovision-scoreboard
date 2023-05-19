import React, { useCallback, useMemo, useRef } from 'react';

import { POINTS_ARRAY } from '../../data';
import allCountries from '../../data/countries.json';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';

import BoardHeader from './BoardHeader';
import CountryItem from './CountryItem';

const MAX_COUNTRY_WITH_POINTS = POINTS_ARRAY.length;

type Props = {
  countries: Country[];
  isJuryVoting: boolean;
  votingPoints: number;
  votingCountryIndex: number;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const Board = ({
  countries,
  isJuryVoting,
  votingPoints,
  votingCountryIndex,
  dispatch,
}: Props): JSX.Element => {
  const timerId = useRef<NodeJS.Timeout | null>(null);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => b.points - a.points),
    [countries],
  );

  const countriesHalfLength = Math.ceil(sortedCountries.length / 2);

  const countriesWithPointsLength = useMemo(
    () => countries.filter((country) => country.lastReceivedPoints).length,
    [countries],
  );

  const votingCountry = allCountries[votingCountryIndex] as Country;

  const hasCountryFinishedVoting =
    countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS;

  const onClick = useCallback(
    (countryCode: string) => {
      // Clear timer and reset points if there's a timer and we give '1' point
      if (
        timerId.current &&
        countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS
      ) {
        clearTimeout(timerId.current);
        timerId.current = null;
        dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
      }
      // Reset points if there's was a random vote and we give '1' point
      if (
        !timerId.current &&
        countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS
      ) {
        dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
      }

      // Set timer to display last received points after giving '12' points
      if (countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS - 1) {
        timerId.current = setTimeout(() => {
          timerId.current = null;

          dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
        }, 3000);
      }

      dispatch({
        type: ScoreboardActionKind.GIVE_JURY_POINTS,
        payload: { countryCode },
      });
    },
    [countriesWithPointsLength, dispatch],
  );

  const renderItem = useCallback(
    (country: Country) => (
      <CountryItem
        key={country.code}
        country={country}
        isJuryVoting={isJuryVoting}
        hasCountryFinishedVoting={hasCountryFinishedVoting}
        isActive={country.code === votingCountry?.code}
        onClick={onClick}
      />
    ),
    [hasCountryFinishedVoting, votingCountry, isJuryVoting, onClick],
  );

  return (
    <div className="w-2/3 h-full">
      <BoardHeader
        isJuryVoting={isJuryVoting}
        votingPoints={votingPoints}
        countries={countries}
        votingCountry={votingCountry}
        dispatch={dispatch}
        onClick={onClick}
      />
      <div className="w-full flex gap-x-6 h-full">
        <div className="w-1/2 h-full">
          {sortedCountries
            .slice(0, countriesHalfLength)
            .map((country: Country) => renderItem(country))}
        </div>
        <div className="w-1/2 h-full">
          {sortedCountries
            .slice(countriesHalfLength)
            .map((country: Country) => renderItem(country))}
        </div>
      </div>
    </div>
  );
};

export default Board;
