import React, { useReducer } from 'react';

import './styles.css';
import '/dist/output.css';

import Board from './components/board';
import ControlsPanel from './components/controlsPanel';
import { pointsArray } from './data';
import countries from './data/countries.json';
import { getNextVotingPoints } from './helpers/getNextVotingPoints';
import {
  Country,
  CountryWithPoints,
  ScoreboardAction,
  ScoreboardActionKind,
  ScoreboardState,
} from './models';

const qualifiedCountries = countries.filter((country) => country.isQualified);

const initialCountries: Country[] = qualifiedCountries.map((country) => ({
  ...country,
  points: 0,
  lastReceivedPoints: 0,
}));

const initialState: ScoreboardState = {
  countries: initialCountries,
  isJuryVoting: true,
  votingCountryIndex: 0,
  votingPoints: 1,
};

function scoreboardReducer(state: ScoreboardState, action: ScoreboardAction) {
  const { type, payload } = action;

  const isNextVotingCountry = state.votingPoints === 12;
  const nextVotingCountryIndex =
    state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);

  const isJuryVotingOver = nextVotingCountryIndex === countries.length - 1;

  switch (type) {
    case ScoreboardActionKind.GIVE_POINTS: {
      return {
        ...state,
        votingPoints: getNextVotingPoints(state.votingPoints),
        votingCountryIndex: nextVotingCountryIndex,
        isJuryVoting: !isJuryVotingOver,
        countries: state.countries.map((country) => {
          if (country.code === payload) {
            return {
              ...country,
              points: country.points + state.votingPoints,
              lastReceivedPoints: isNextVotingCountry ? 0 : state.votingPoints,
            };
          }

          return {
            ...country,
            lastReceivedPoints: isNextVotingCountry
              ? 0
              : country.lastReceivedPoints,
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
            ),
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
        countries: state.countries.map((country) => {
          const randomlyReceivedPoints =
            countriesWithPoints.find(
              (countryWithPoints) => countryWithPoints.code === country.code,
            )?.points || 0;

          return {
            ...country,
            points: country.points + randomlyReceivedPoints,
            lastReceivedPoints: 0,
          };
        }),
      };
    }
    default:
      return state;
  }
}
export const App = () => {
  const [state, dispatch] = useReducer(scoreboardReducer, initialState);

  return (
    <div className="container px-[15%] pt-20 mb-16 w-full flex gap-x-6">
      <Board countries={state.countries} dispatch={dispatch} />
      <ControlsPanel
        votingCountryIndex={state.votingCountryIndex}
        votingPoints={state.votingPoints}
        isJuryVoting={state.isJuryVoting}
        dispatch={dispatch}
      />
    </div>
  );
};
