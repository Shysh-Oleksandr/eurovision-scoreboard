import React, { useCallback, useMemo, useRef } from 'react';
import FlipMove from 'react-flip-move';

import { POINTS_ARRAY } from '../../data';
import allCountries from '../../data/countries.json';
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
  dispatch: React.Dispatch<ScoreboardAction>;
};

const Board = ({
  countries,
  isJuryVoting,
  winnerCountry,
  votingPoints,
  votingCountryIndex,
  dispatch,
}: Props): JSX.Element => {
  const timerId = useRef<NodeJS.Timeout | null>(null);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => b.points - a.points),
    [countries],
  );

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

      const isJuryVotingOver = votingCountryIndex === allCountries.length - 1;

      // Set timer to display last received points if we give '12' points and it's not the last country
      if (
        countriesWithPointsLength === MAX_COUNTRY_WITH_POINTS - 1 &&
        !isJuryVotingOver
      ) {
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
    [countriesWithPointsLength, dispatch, votingCountryIndex],
  );

  const renderItem = useCallback(
    (country: Country) => (
      <CountryItem
        key={country.code}
        country={country}
        isJuryVoting={isJuryVoting}
        hasCountryFinishedVoting={hasCountryFinishedVoting}
        isActive={country.code === votingCountry?.code && !isJuryVoting}
        onClick={onClick}
      />
    ),
    [hasCountryFinishedVoting, votingCountry, isJuryVoting, onClick],
  );

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
        <FlipMove duration={500}>
          {sortedCountries.map((country: Country) => renderItem(country))}
        </FlipMove>
      </div>
    </div>
  );
};

export default Board;
