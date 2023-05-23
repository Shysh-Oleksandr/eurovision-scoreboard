import { POINTS_ARRAY, QUALIFIED_COUNTRIES } from './../data';
import countries from './../data/countries.json';
import { getNextVotingPoints } from './../helpers/getNextVotingPoints';
import {
  Country,
  CountryWithPoints,
  ScoreboardAction,
  ScoreboardActionKind,
} from './../models';

const initialCountries: Country[] = QUALIFIED_COUNTRIES.map((country) => ({
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
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
}

export const initialState: ScoreboardState = {
  countries: initialCountries,
  isJuryVoting: true,
  votingCountryIndex: 0,
  votingPoints: 1,
  shouldShowLastPoints: true,
  shouldClearPoints: false,
  winnerCountry: null,
};

function scoreboardReducer(state: ScoreboardState, action: ScoreboardAction) {
  const { type, payload } = action;

  const countriesWithPointsLength = state.countries.filter(
    (country) => country.lastReceivedPoints,
  ).length;

  const shouldResetLastPoints =
    countriesWithPointsLength === POINTS_ARRAY.length;

  const countriesLeft = state.countries.filter(
    (country) =>
      !country.isVotingFinished && country.code !== payload?.countryCode,
  );

  const lastCountryCodeByPoints = countriesLeft.length
    ? [...countriesLeft].sort((a, b) => b.points - a.points)[
        countriesLeft.length - 1
      ].code
    : '';

  const lastCountryByPointsIndex = countries.findIndex(
    (country) => country.code === lastCountryCodeByPoints,
  );

  const isVotingOver = lastCountryByPointsIndex === -1;

  switch (type) {
    case ScoreboardActionKind.GIVE_JURY_POINTS: {
      const isNextVotingCountry = state.votingPoints === 12;
      const nextVotingCountryIndex =
        state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);

      const isJuryVotingOver = nextVotingCountryIndex === countries.length;

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
      const mappedCountries = state.countries.map((country) => {
        if (country.code === payload?.countryCode) {
          return {
            ...country,
            points: country.points + (payload?.votingPoints ?? 0),
            lastReceivedPoints: payload?.votingPoints ?? 0,
            isVotingFinished: true,
          };
        }

        return country;
      });

      let winnerCountry = null;

      if (isVotingOver) {
        winnerCountry = mappedCountries.reduce((prev, current) => {
          return prev.points > current.points ? prev : current;
        });
      }

      return {
        ...state,
        votingCountryIndex: lastCountryByPointsIndex,
        isJuryVoting: false,
        shouldShowLastPoints: false,
        shouldClearPoints: true,
        winnerCountry,
        countries: mappedCountries,
      };
    }

    case ScoreboardActionKind.GIVE_RANDOM_JURY_POINTS: {
      const isJuryVotingOver =
        state.votingCountryIndex === countries.length - 1;

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

      const mappedCountries = state.countries.map((country) => {
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
      });

      let televoteCountryIndex = lastCountryByPointsIndex;

      if (isJuryVotingOver) {
        const lastCountryCodeByPoints = [...mappedCountries].sort(
          (a, b) => b.points - a.points,
        )[mappedCountries.length - 1].code;

        televoteCountryIndex = countries.findIndex(
          (country) => country.code === lastCountryCodeByPoints,
        );
      }

      return {
        ...state,
        votingPoints: 1,
        votingCountryIndex: isJuryVotingOver
          ? televoteCountryIndex
          : state.votingCountryIndex + 1,
        isJuryVoting: !isJuryVotingOver,
        shouldShowLastPoints: !payload?.isRandomFinishing,
        countries: mappedCountries,
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

    case ScoreboardActionKind.START_OVER:
      return initialState;

    default:
      return state;
  }
}

export default scoreboardReducer;
