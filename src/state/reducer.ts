import { POINTS_ARRAY } from './../data';
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
    countriesWithPointsLength === POINTS_ARRAY.length;

  const countriesLeft = state.countries.filter(
    (country) =>
      !country.isVotingFinished && country.code !== payload?.countryCode,
  );

  const lastCountryCodeByPoints = [...countriesLeft].sort(
    (a, b) => a.points - b.points,
  )[0].code;

  const lastCountryByPointsIndex = countries.findIndex(
    (country) => country.code === lastCountryCodeByPoints,
  );

  switch (type) {
    case ScoreboardActionKind.GIVE_JURY_POINTS: {
      return {
        ...state,
        votingPoints: getNextVotingPoints(state.votingPoints),
        votingCountryIndex: isJuryVotingOver
          ? lastCountryByPointsIndex
          : nextVotingCountryIndex,
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

          return country;
        }),
      };
    }
    case ScoreboardActionKind.GIVE_TELEVOTE_POINTS: {
      return {
        ...state,
        votingCountryIndex: lastCountryByPointsIndex,
        isJuryVoting: false,
        shouldShowLastPoints: true,
        countries: state.countries.map((country) => {
          if (country.code === payload?.countryCode) {
            return {
              ...country,
              points: country.points + (payload?.votingPoints ?? 0),
              lastReceivedPoints: payload?.votingPoints ?? 0,
              isVotingFinished: true,
            };
          }

          return country;
        }),
      };
    }

    case ScoreboardActionKind.GIVE_RANDOM_POINTS: {
      const countriesWithPoints: CountryWithPoints[] = [];

      const pointsLeftArray = POINTS_ARRAY.filter(
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
        votingCountryIndex: isJuryVotingOver
          ? lastCountryByPointsIndex
          : state.votingCountryIndex + 1,
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
    case ScoreboardActionKind.HIDE_LAST_RECEIVED_POINTS:
      return {
        ...state,
        shouldShowLastPoints: false,
      };

    default:
      return state;
  }
}

export default scoreboardReducer;
