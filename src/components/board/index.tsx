import React, { useCallback, useMemo, useRef } from 'react';

import { pointsArray } from '../../data';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';

import BoardHeader from './BoardHeader';
import CountryItem from './CountryItem';

const MAX_COUNTRY_WITH_POINTS = pointsArray.length;

type Props = {
  countries: Country[];
  isJuryVoting: boolean;
  votingPoints: number;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const Board = ({
  countries,
  isJuryVoting,
  votingPoints,
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
        type: ScoreboardActionKind.GIVE_POINTS,
        payload: { countryCode },
      });
    },
    [countriesWithPointsLength, dispatch],
  );

  return (
    <div className="w-2/3 h-full">
      <BoardHeader
        isJuryVoting={isJuryVoting}
        votingPoints={votingPoints}
        countries={countries}
        onClick={onClick}
      />
      <div className="w-full flex gap-x-6 h-full">
        <div className="w-1/2 h-full">
          {sortedCountries
            .slice(0, countriesHalfLength)
            .map((country: Country) => (
              <CountryItem
                key={country.code}
                country={country}
                hasCountryFinishedVoting={hasCountryFinishedVoting}
                onClick={onClick}
              />
            ))}
        </div>
        <div className="w-1/2 h-full">
          {sortedCountries
            .slice(countriesHalfLength)
            .map((country: Country) => (
              <CountryItem
                key={country.code}
                country={country}
                hasCountryFinishedVoting={hasCountryFinishedVoting}
                onClick={onClick}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Board;
