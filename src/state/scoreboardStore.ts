import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { POINTS_ARRAY } from '../data/data';
import { getNextVotingPoints } from '../helpers/getNextVotingPoints';
import { Country, CountryWithPoints } from '../models';

import { useCountriesStore } from './countriesStore';

interface ScoreboardState {
  // State
  countries: Country[];
  isJuryVoting: boolean;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;

  // Actions
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: (isRandomFinishing?: boolean) => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startOver: () => void;
}

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

export const useScoreboardStore = create<ScoreboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      countries: useCountriesStore.getState().getInitialCountries(),
      isJuryVoting: true,
      votingCountryIndex: 0,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,

      // Actions
      giveJuryPoints: (countryCode: string) => {
        const state = get();
        const countriesStore = useCountriesStore.getState();

        const countriesWithPoints = state.countries.filter(
          (country) => country.lastReceivedPoints !== null,
        );
        const shouldReset = shouldResetLastPoints(countriesWithPoints);

        const isNextVotingCountry = state.votingPoints === 12;
        const nextVotingCountryIndex =
          state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
        const isJuryVotingOver =
          nextVotingCountryIndex === countriesStore.getCountriesLength();

        set({
          votingPoints: getNextVotingPoints(state.votingPoints),
          votingCountryIndex: isJuryVotingOver
            ? getLastCountryIndexByPoints(
                state.countries,
                getLastCountryCodeByPoints(
                  getRemainingCountries(state.countries, countryCode),
                ),
              )
            : nextVotingCountryIndex,
          isJuryVoting: !isJuryVotingOver,
          shouldShowLastPoints: !shouldReset,
          countries: state.countries.map((country) => {
            if (country.code === countryCode) {
              return {
                ...country,
                points: country.points + state.votingPoints,
                lastReceivedPoints: state.votingPoints,
              };
            }

            return country;
          }),
        });
      },

      giveTelevotePoints: (countryCode: string, votingPoints: number) => {
        const state = get();

        const updatedCountries = state.countries.map((country) => {
          if (country.code === countryCode) {
            return {
              ...country,
              points: country.points + (votingPoints ?? 0),
              lastReceivedPoints: votingPoints ?? null,
              isVotingFinished: true,
            } as Country;
          }

          return country;
        });

        const lastCountryIndexByPoints = getLastCountryIndexByPoints(
          state.countries,
          getLastCountryCodeByPoints(
            getRemainingCountries(state.countries, countryCode),
          ),
        );
        const isVotingFinished = isVotingOver(lastCountryIndexByPoints);

        const winnerCountry = isVotingFinished
          ? updatedCountries.reduce((prev, current) =>
              prev.points > current.points ? prev : current,
            )
          : null;

        set({
          votingCountryIndex: lastCountryIndexByPoints,
          isJuryVoting: false,
          shouldShowLastPoints: false,
          shouldClearPoints: true,
          winnerCountry,
          countries: updatedCountries,
        });
      },

      giveRandomJuryPoints: (isRandomFinishing = false) => {
        const state = get();
        const countriesStore = useCountriesStore.getState();

        const isJuryVotingOver =
          state.votingCountryIndex === countriesStore.getCountriesLength() - 1;
        const votingCountryCode =
          countriesStore.allCountries[state.votingCountryIndex].code;

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

        set({
          votingPoints: 1,
          votingCountryIndex: isJuryVotingOver
            ? televoteCountryIndex
            : state.votingCountryIndex + 1,
          isJuryVoting: !isJuryVotingOver,
          shouldShowLastPoints: !isRandomFinishing,
          countries: updatedCountries,
        });
      },

      resetLastPoints: () => {
        const state = get();

        set({
          countries: state.countries.map((country) => ({
            ...country,
            lastReceivedPoints: null,
          })),
        });
      },

      hideLastReceivedPoints: () => {
        set({
          shouldShowLastPoints: false,
        });
      },

      startOver: () => {
        set({
          countries: useCountriesStore.getState().getInitialCountries(),
          isJuryVoting: true,
          votingCountryIndex: 0,
          votingPoints: 1,
          shouldShowLastPoints: true,
          shouldClearPoints: false,
          winnerCountry: null,
        });
      },
    }),
    { name: 'scoreboard-store' },
  ),
);
