import React, { useMemo } from 'react';

import { Country, ScoreboardAction } from '../../models';

import CountryItem from './CountryItem';

type Props = {
  countries: Country[];
  dispatch: React.Dispatch<ScoreboardAction>;
};

const Board = ({ countries, dispatch }: Props): JSX.Element => {
  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => b.points - a.points),
    [countries],
  );

  const countriesHalfLength = Math.ceil(sortedCountries.length / 2);

  return (
    <div className="w-2/3 flex gap-x-6 h-full">
      <div className="w-1/2 h-full">
        {sortedCountries
          .slice(0, countriesHalfLength)
          .map((country: Country) => (
            <CountryItem
              key={country.code}
              country={country}
              dispatch={dispatch}
            />
          ))}
      </div>
      <div className="w-1/2 h-full">
        {sortedCountries.slice(countriesHalfLength).map((country: Country) => (
          <CountryItem
            key={country.code}
            country={country}
            dispatch={dispatch}
          />
        ))}
      </div>
    </div>
  );
};

export default Board;
