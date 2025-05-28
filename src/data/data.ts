import { Year } from '../config';
import { BaseCountry } from '../models';

import { COUNTRIES_2023, COUNTRIES_2024 } from './countries/';

export const getCountriesData = (year?: Year) => {
  switch (year) {
    case '2023':
      return COUNTRIES_2023;

    default:
      return COUNTRIES_2024;
  }
};

let cachedCountryData: BaseCountry[] = getCountriesData();

export const getAllCountries = () => cachedCountryData;

export const reinitializeCountriesData = (year: Year) => {
  cachedCountryData = getCountriesData(year);
};

export const getCountriesLength = () => {
  return cachedCountryData.length;
};
export const getInitialCountries = () => {
  return getQualifiedCountries().map((country) => ({
    ...country,
    points: 0,
    lastReceivedPoints: null,
  }));
};

export const getQualifiedCountries = () => {
  return cachedCountryData.filter(
    (country: BaseCountry) => country.isQualified,
  );
};

export const getTotalTelevotePoints = () => {
  const countryVotingPoints = POINTS_ARRAY.reduce(
    (prev, curr) => prev + curr,
    0,
  );

  return countryVotingPoints * (getCountriesLength() - 1);
};

const MAX_POINTS_FOR_A_VOTE = 12;

export const getMaxPossibleTelevotePoints = () => {
  return MAX_POINTS_FOR_A_VOTE * (getCountriesLength() - 1);
};

export const getAverageVotingPoints = () => {
  return Math.round(getTotalTelevotePoints() / getCountriesLength());
};

export const ANIMATION_DURATION = 3000;

export const POINTS_ARRAY = new Array(10).fill(0).map((_, index) => {
  const points = index + 1;

  if (points === 9) return 10;

  if (points === 10) return 12;

  return points;
});
