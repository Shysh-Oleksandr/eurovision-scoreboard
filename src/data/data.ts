import { Year } from '../config';
import { BaseCountry } from '../models';

import {
  COUNTRIES_2013,
  COUNTRIES_2014,
  COUNTRIES_2015,
  COUNTRIES_2016,
  COUNTRIES_2017,
  COUNTRIES_2018,
  COUNTRIES_2019,
  COUNTRIES_2021,
  COUNTRIES_2022,
  COUNTRIES_2023,
  COUNTRIES_2024,
  COUNTRIES_2025,
} from './countries';

export const SUPPORTED_YEARS = [
  2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025,
];

export const getCountriesByYear = (year: Year): BaseCountry[] => {
  switch (year) {
    case '2013':
      return COUNTRIES_2013;
    case '2014':
      return COUNTRIES_2014;
    case '2015':
      return COUNTRIES_2015;
    case '2016':
      return COUNTRIES_2016;
    case '2017':
      return COUNTRIES_2017;
    case '2018':
      return COUNTRIES_2018;
    case '2019':
      return COUNTRIES_2019;
    case '2021':
      return COUNTRIES_2021;
    case '2022':
      return COUNTRIES_2022;
    case '2023':
      return COUNTRIES_2023;
    case '2024':
      return COUNTRIES_2024;
    case '2025':
    default:
      return COUNTRIES_2025;
  }
};

export const POINTS_ARRAY = new Array(10).fill(0).map((_, index) => {
  const points = index + 1;

  if (points === 9) return 10;

  if (points === 10) return 12;

  return points;
});

const MAX_POINTS_FOR_A_VOTE = 12;

export const getMaxPossibleTelevotePoints = (countriesLength: number) => {
  return MAX_POINTS_FOR_A_VOTE * (countriesLength - 1);
};

const getTotalTelevotePoints = (countriesLength: number) => {
  const countryVotingPoints = POINTS_ARRAY.reduce(
    (prev, curr) => prev + curr,
    0,
  );

  return countryVotingPoints * (countriesLength - 1);
};

export const getAverageVotingPoints = (countriesLength: number) => {
  return Math.round(getTotalTelevotePoints(countriesLength) / countriesLength);
};

export const ANIMATION_DURATION = 3000;
