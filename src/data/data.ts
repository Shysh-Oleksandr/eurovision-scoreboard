import { PointsItem } from '@/state/generalStore';
import { BaseCountry, VotingCountry } from '../models';
import { getHostingCountryByYear } from '@/theme/hosting';
import { Year } from '@/config';
import { ESC_YEARS_WITH_THEME, JUNIOR_YEARS_WITH_THEME } from '@/theme/themes';

export const SUPPORTED_YEARS = Array.from({ length: 22 }, (_, i) => 2004 + i);

// Junior Eurovision years supported in the app
export const JUNIOR_SUPPORTED_YEARS = Array.from(
  { length: 10 },
  (_, i) => 2016 + i,
);

export const JUNIOR_THEME_PREFIX = 'JESC-';

export const ALL_THEMES = [
  ...SUPPORTED_YEARS,
  ...JUNIOR_SUPPORTED_YEARS.map((year) => `${JUNIOR_THEME_PREFIX}${year}`),
];

export const ESC_YEAR_OPTIONS = SUPPORTED_YEARS.map((year) => ({
  value: year.toString(),
  label: year.toString(),
  imageUrl: getHostingCountryByYear(year.toString() as Year).logo,
}));

export const JESC_YEAR_OPTIONS = JUNIOR_SUPPORTED_YEARS.map((year) => ({
  value: `${JUNIOR_THEME_PREFIX}${year}`,
  label: year.toString(),
  imageUrl: getHostingCountryByYear(year.toString() as Year, true).logo,
}));

export const THEME_OPTIONS = ESC_YEARS_WITH_THEME.map((year) => ({
  value: year.toString(),
  label: year.toString(),
}));
export const JESC_THEME_OPTIONS = JUNIOR_YEARS_WITH_THEME.map((year) => {
  const yearNumber = parseInt(year.replace(JUNIOR_THEME_PREFIX, ''));

  return {
    value: `${JUNIOR_THEME_PREFIX}${yearNumber}`,
    label: yearNumber.toString(),
  };
});

export const POINTS_ARRAY = new Array(10).fill(0).map((_, index) => {
  const points = index + 1;

  if (points === 9) return 10;

  if (points === 10) return 12;

  return points;
});

export const getMaxPossibleTelevotePoints = (
  votingCountries: VotingCountry[],
  votingCountryCode: string,
  pointsSystem: PointsItem[],
) => {
  const maxPointsInSystem = pointsSystem.reduce(
    (sum, item) => Math.max(sum, item.value),
    0,
  );

  const votingCountriesLength = votingCountries.filter(
    (country) => country.code !== votingCountryCode,
  ).length;
  return maxPointsInSystem * votingCountriesLength;
};

export const getTotalTelevotePoints = (
  votingCountriesLength: number,
  pointsSystem: PointsItem[],
) => {
  // Calculate total points available in the points system
  const totalPointsInSystem = pointsSystem.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  // Each voting country can give totalPointsInSystem points total
  // The total available points for the stage is the sum of all points in the system * number of voting countries
  return totalPointsInSystem * votingCountriesLength;
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
  melodifestivalen: [1, 2, 4, 6, 8, 10, 12].map((value, index) => ({
    value,
    showDouzePoints: value === 12,
    id: index,
  })),
};
