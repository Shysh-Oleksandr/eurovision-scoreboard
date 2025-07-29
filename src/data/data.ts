import { Year } from '../config';
import { BaseCountry } from '../models';

import {
  COUNTRIES_2004,
  COUNTRIES_2005,
  COUNTRIES_2006,
  COUNTRIES_2007,
  COUNTRIES_2008,
  COUNTRIES_2009,
  COUNTRIES_2010,
  COUNTRIES_2011,
  COUNTRIES_2012,
  COUNTRIES_2013,
  COUNTRIES_2014,
  COUNTRIES_2015,
  COUNTRIES_2016,
  COUNTRIES_2017,
  COUNTRIES_2018,
  COUNTRIES_2019,
  COUNTRIES_2020,
  COUNTRIES_2021,
  COUNTRIES_2022,
  COUNTRIES_2023,
  COUNTRIES_2024,
  COUNTRIES_2025,
} from './countries';

import { PointsItem } from '@/state/generalStore';

export const SUPPORTED_YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i);

export const getCountriesByYear = (year: Year): BaseCountry[] => {
  switch (year) {
    case '2004':
      return COUNTRIES_2004;
    case '2005':
      return COUNTRIES_2005;
    case '2006':
      return COUNTRIES_2006;
    case '2007':
      return COUNTRIES_2007;
    case '2008':
      return COUNTRIES_2008;
    case '2009':
      return COUNTRIES_2009;
    case '2010':
      return COUNTRIES_2010;
    case '2011':
      return COUNTRIES_2011;
    case '2012':
      return COUNTRIES_2012;
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
    case '2020':
      return COUNTRIES_2020;
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

export const ANIMATION_DURATION = 3000;

export const PREDEFINED_SYSTEMS_MAP: Record<string, PointsItem[]> = {
  default: POINTS_ARRAY.map((value, index) => ({
    value,
    showDouzePoints: value === 12,
    id: index,
  })),
  reversed: [...POINTS_ARRAY].reverse().map((value, index) => ({
    value,
    showDouzePoints: value === 12,
    id: index,
  })),
  old: Array(10)
    .fill(1)
    .map((value, index) => ({
      value,
      showDouzePoints: false,
      id: index,
    })),
};
