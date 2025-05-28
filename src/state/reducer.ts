import {
  getAllCountries,
  getCountriesLength,
  getInitialCountries,
  POINTS_ARRAY,
} from '../data/data';

import { getNextVotingPoints } from './../helpers/getNextVotingPoints';
import {
  Country,
  CountryWithPoints,
  ScoreboardAction,
  ScoreboardActionKind,
} from './../models';

interface ScoreboardState {
  countries: Country[];
  isJuryVoting: boolean;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
  triggerRerender: boolean;
}

const initialCountries: Country[] = getInitialCountries();

export const initialState: ScoreboardState = {
  countries: initialCountries,
  isJuryVoting: true,
  votingCountryIndex: 0,
  votingPoints: 1,
  shouldShowLastPoints: true,
  shouldClearPoints: false,
  winnerCountry: null,
  triggerRerender: false,
};

const shouldResetLastPoints = (countriesWithPoints: CountryWithPoints[]) =>
  countriesWithPoints.length === POINTS_ARRAY.length;

const getRemainingCountries = (
  countries: Country[],
  countryCode: string | undefined,
) =>
  countries.filter(
    (country) => !country.isVotingFinished && country.code !== countryCode,
  );

const getLastCountryCodeByPoints = (remainingCountries: Country[]) =>
  remainingCountries.length
    ? remainingCountries.slice().sort((a, b) => b.points - a.points)[
        remainingCountries.length - 1
      ].code
    : '';

const getLastCountryIndexByPoints = (
  countries: Country[],
  countryCode: string,
) => countries.findIndex((country) => country.code === countryCode);

const isVotingOver = (lastCountryIndexByPoints: number) =>
  lastCountryIndexByPoints === -1;

const handleGiveJuryPoints = (state: ScoreboardState, payload: any) => {
  const countriesWithPoints = state.countries.filter(
    (country) => country.lastReceivedPoints !== null,
  );
  const shouldReset = shouldResetLastPoints(countriesWithPoints);

  const isNextVotingCountry = state.votingPoints === 12;
  const nextVotingCountryIndex =
    state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
  const isJuryVotingOver = nextVotingCountryIndex === getCountriesLength();

  return {
    ...state,
    votingPoints: getNextVotingPoints(state.votingPoints),
    votingCountryIndex: isJuryVotingOver
      ? getLastCountryIndexByPoints(
          state.countries,
          getLastCountryCodeByPoints(
            getRemainingCountries(state.countries, payload?.countryCode),
          ),
        )
      : nextVotingCountryIndex,
    isJuryVoting: !isJuryVotingOver,
    shouldShowLastPoints: !shouldReset,
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
};

const handleGiveTelevotePoints = (state: ScoreboardState, payload: any) => {
  const updatedCountries = state.countries.map((country) => {
    if (country.code === payload?.countryCode) {
      return {
        ...country,
        points: country.points + (payload?.votingPoints ?? 0),
        lastReceivedPoints: payload?.votingPoints ?? null,
        isVotingFinished: true,
      } as Country;
    }

    return country;
  });

  const lastCountryIndexByPoints = getLastCountryIndexByPoints(
    state.countries,
    getLastCountryCodeByPoints(
      getRemainingCountries(state.countries, payload?.countryCode),
    ),
  );
  const isVotingFinished = isVotingOver(lastCountryIndexByPoints);

  const winnerCountry = isVotingFinished
    ? updatedCountries.reduce((prev, current) =>
        prev.points > current.points ? prev : current,
      )
    : null;

  return {
    ...state,
    votingCountryIndex: lastCountryIndexByPoints,
    isJuryVoting: false,
    shouldShowLastPoints: false,
    shouldClearPoints: true,
    winnerCountry,
    countries: updatedCountries,
  };
};

const handleGiveRandomJuryPoints = (state: ScoreboardState, payload: any) => {
  const isJuryVotingOver =
    state.votingCountryIndex === getCountriesLength() - 1;
  const votingCountryCode = getAllCountries()[state.votingCountryIndex].code;

  const countriesWithPoints: CountryWithPoints[] = [];

  const pointsLeftArray = POINTS_ARRAY.filter(
    (points) => points >= state.votingPoints,
  );

  pointsLeftArray.forEach((points) => {
    const availableCountries = state.countries.filter(
      (country) =>
        !countriesWithPoints.some(
          (countryWithPoints) => countryWithPoints.code === country.code,
        ) &&
        country.lastReceivedPoints === null &&
        country.code !== votingCountryCode,
    );

    const randomCountryIndex = Math.floor(
      Math.random() * availableCountries.length,
    );
    const randomCountry = availableCountries[randomCountryIndex];

    countriesWithPoints.push({ code: randomCountry.code, points });
  });

  const updatedCountries = state.countries.map((country) => {
    const receivedPoints =
      countriesWithPoints.find(
        (countryWithPoints) => countryWithPoints.code === country.code,
      )?.points || 0;

    return {
      ...country,
      points: country.points + receivedPoints,
      lastReceivedPoints:
        receivedPoints ||
        (shouldResetLastPoints(countriesWithPoints)
          ? null
          : country.lastReceivedPoints),
    };
  });

  const televoteCountryIndex = getLastCountryIndexByPoints(
    state.countries,
    getLastCountryCodeByPoints(updatedCountries),
  );

  return {
    ...state,
    votingPoints: 1,
    votingCountryIndex: isJuryVotingOver
      ? televoteCountryIndex
      : state.votingCountryIndex + 1,
    isJuryVoting: !isJuryVotingOver,
    shouldShowLastPoints: !payload?.isRandomFinishing,
    countries: updatedCountries,
  };
};

const handleResetLastPoints = (state: ScoreboardState) => ({
  ...state,
  countries: state.countries.map((country) => ({
    ...country,
    lastReceivedPoints: null,
  })),
});

const handleHideLastReceivedPoints = (state: ScoreboardState) => ({
  ...state,
  shouldShowLastPoints: false,
});
const triggerRerender = (state: ScoreboardState) => ({
  ...state,
  triggerRerender: !state.triggerRerender,
});

const handleStartOver = (): ScoreboardState => {
  return { ...initialState, countries: getInitialCountries() };
};

function scoreboardReducer(state: ScoreboardState, action: ScoreboardAction) {
  const { type, payload } = action;

  switch (type) {
    case ScoreboardActionKind.GIVE_JURY_POINTS:
      return handleGiveJuryPoints(state, payload);
    case ScoreboardActionKind.GIVE_TELEVOTE_POINTS:
      return handleGiveTelevotePoints(state, payload);
    case ScoreboardActionKind.GIVE_RANDOM_JURY_POINTS:
      return handleGiveRandomJuryPoints(state, payload);
    case ScoreboardActionKind.RESET_LAST_POINTS:
      return handleResetLastPoints(state);
    case ScoreboardActionKind.HIDE_LAST_RECEIVED_POINTS:
      return handleHideLastReceivedPoints(state);
    case ScoreboardActionKind.TRIGGER_RERENDER:
      return triggerRerender(state);
    case ScoreboardActionKind.START_OVER:
      return handleStartOver();
    default:
      return state;
  }
}

export default scoreboardReducer;
