import { pointsArray } from './../data';
import countries from './../data/countries.json';
import { getNextVotingPoints } from './../helpers/getNextVotingPoints';
import {
  Country,
  CountryWithPoints,
  ScoreboardAction,
  ScoreboardActionKind,
} from './../models';

const qualifiedCountries = countries.filter((country) => country.isQualified);

const initialCountries: Country[] = qualifiedCountries.map((country) => ({
  ...country,
  points: 0,
  lastReceivedPoints: 0,
}));

interface ScoreboardState {
  countries: Country[];
  isJuryVoting: boolean;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
}

export const initialState: ScoreboardState = {
  countries: initialCountries,
  isJuryVoting: true,
  votingCountryIndex: 0,
  votingPoints: 1,
  shouldShowLastPoints: false,
};

function scoreboardReducer(state: ScoreboardState, action: ScoreboardAction) {
  const { type, payload } = action;

  const isNextVotingCountry = state.votingPoints === 12;
  const nextVotingCountryIndex =
    state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);

  const isJuryVotingOver = nextVotingCountryIndex === countries.length - 1;

  const countriesWithPointsLength = state.countries.filter(
    (country) => country.lastReceivedPoints,
  ).length;

  const shouldResetLastPoints =
    countriesWithPointsLength === pointsArray.length;

  switch (type) {
    case ScoreboardActionKind.GIVE_POINTS: {
      return {
        ...state,
        votingPoints: getNextVotingPoints(state.votingPoints),
        votingCountryIndex: nextVotingCountryIndex,
        isJuryVoting: !isJuryVotingOver,
        shouldShowLastPoints: !shouldResetLastPoints,
        countries: state.countries.map((country) => {
          if (country.code === payload?.countryCode) {
            return {
              ...country,
              points: country.points + state.votingPoints,
              lastReceivedPoints: state.votingPoints,
            };
          }

          return {
            ...country,
          };
        }),
      };
    }

    case ScoreboardActionKind.GIVE_RANDOM_POINTS: {
      const countriesWithPoints: CountryWithPoints[] = [];

      const pointsLeftArray = pointsArray.filter(
        (points) => points >= state.votingPoints,
      );

      pointsLeftArray.forEach((points) => {
        const countriesWithoutPoints = state.countries.filter(
          (country) =>
            !countriesWithPoints.some(
              (countryWithPoints) => countryWithPoints.code === country.code,
            ) && !country.lastReceivedPoints,
        );

        const randomCountryIndex = Math.floor(
          Math.random() * countriesWithoutPoints.length,
        );
        const randomCountry = countriesWithoutPoints[randomCountryIndex];

        countriesWithPoints.push({ code: randomCountry.code, points });
      });

      return {
        ...state,
        votingPoints: 1,
        votingCountryIndex: state.votingCountryIndex + 1,
        isJuryVoting: !isJuryVotingOver,
        shouldShowLastPoints: true,
        countries: state.countries.map((country) => {
          const randomlyReceivedPoints =
            countriesWithPoints.find(
              (countryWithPoints) => countryWithPoints.code === country.code,
            )?.points || 0;

          return {
            ...country,
            points: country.points + randomlyReceivedPoints,
            lastReceivedPoints:
              randomlyReceivedPoints ||
              (shouldResetLastPoints ? 0 : country.lastReceivedPoints),
          };
        }),
      };
    }

    case ScoreboardActionKind.RESET_LAST_POINTS: {
      return {
        ...state,
        countries: state.countries.map((country) => {
          return {
            ...country,
            lastReceivedPoints: 0,
          };
        }),
      };
    }
    case ScoreboardActionKind.SET_SHOW_LAST_POINTS:
      return {
        ...state,
        shouldShowLastPoints: !!payload?.shouldShowLastPoints,
      };

    default:
      return state;
  }
}

export default scoreboardReducer;
