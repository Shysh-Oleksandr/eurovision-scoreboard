import countries from './countries.json';

export const POINTS_ARRAY = new Array(10).fill(0).map((_, index) => {
  const points = index + 1;

  if (points === 9) return 10;

  if (points === 10) return 12;

  return points;
});

export const COUNTRIES_LENGTH = countries.length;

const countryVotingPoints = POINTS_ARRAY.reduce((prev, curr) => prev + curr, 0);

export const TOTAL_TELEVOTE_POINTS =
  countryVotingPoints * (COUNTRIES_LENGTH - 1);
export const MAX_POSSIBLE_TELEVOTE_POINTS = 12 * (COUNTRIES_LENGTH - 1);

export const AVERAGE_VOTING_POINTS = Math.round(
  TOTAL_TELEVOTE_POINTS / COUNTRIES_LENGTH,
);
