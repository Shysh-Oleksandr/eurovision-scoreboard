import React from 'react';

import countries from '../../data/countries.json';
import { Country } from '../../models';

import CountryItem from './CountryItem';

const qualifiedCountries = countries.filter((country) => country.isQualified);
const countriesHalfLength = Math.ceil(qualifiedCountries.length / 2);

const Board = (): JSX.Element => {
  return (
    <div className="w-2/3 flex gap-x-6 h-full">
      <div className="w-1/2 h-full">
        {qualifiedCountries
          .slice(0, countriesHalfLength)
          .map((country: Country) => (
            <CountryItem key={country.code} country={country} />
          ))}
      </div>
      <div className="w-1/2 h-full">
        {qualifiedCountries
          .slice(countriesHalfLength)
          .map((country: Country) => (
            <CountryItem key={country.code} country={country} />
          ))}
      </div>
    </div>
  );
};

export default Board;
