import React, { useCallback, useMemo, useRef } from 'react';

import { pointsArray } from '../../data';
import { Country, ScoreboardAction, ScoreboardActionKind } from '../../models';

import CountryItem from './CountryItem';

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

  const onPress = useCallback(
    (countryCode: string) => {
      const countriesWithPointsLength = countries.filter(
        (country) => country.lastReceivedPoints,
      ).length;

      // Clear timer and reset points if there's a timer and we give '1' point
      if (timerId.current && countriesWithPointsLength === pointsArray.length) {
        clearTimeout(timerId.current);
        timerId.current = null;
        dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
      }
      // Reset points if there's was a random vote and we give '1' point
      if (
        !timerId.current &&
        countriesWithPointsLength === pointsArray.length
      ) {
        dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
      }

      // Set timer to display last received points after giving '12' points
      if (countriesWithPointsLength === pointsArray.length - 1) {
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
    [countries, dispatch],
  );

  return (
    <div className="w-2/3 h-full">
      <div className="pb-2">
        <h3 className="text-2xl text-white">
          {isJuryVoting
            ? `Choose a country to give ${votingPoints} point${
                votingPoints === 1 ? '' : 's'
              }`
            : ''}
        </h3>
      </div>
      <div className="w-full flex gap-x-6 h-full">
        <div className="w-1/2 h-full">
          {sortedCountries
            .slice(0, countriesHalfLength)
            .map((country: Country) => (
              <CountryItem
                key={country.code}
                country={country}
                onPress={onPress}
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
                onPress={onPress}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Board;
