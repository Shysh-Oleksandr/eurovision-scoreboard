import { StateCreator } from 'zustand';

import { POINTS_ARRAY } from '../../data/data';
import { getNextVotingPoints } from '../../helpers/getNextVotingPoints';
import { getRandomTelevotePoints } from '../../helpers/getRandomTelevotePoints';
import {
  Country,
  CountryWithPoints,
  EventStage,
  StageVotingMode,
} from '../../models';
import { useCountriesStore } from '../countriesStore';

import {
  getLastCountryCodeByPoints,
  getLastCountryIndexByPoints,
  getRemainingCountries,
  handleStageEnd,
  isVotingOver,
} from './helpers';
import { ScoreboardState } from './types';

type VotingActions = {
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: () => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
};

export const createVotingActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  VotingActions
> = (set, get) => ({
  giveJuryPoints: (countryCode: string) => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    const countriesWithPoints = currentStage.countries.filter(
      (country: Country) => country.lastReceivedPoints !== null,
    );
    const shouldReset = countriesWithPoints.length === POINTS_ARRAY.length;

    const isNextVotingCountry = state.votingPoints === 12;
    const nextVotingCountryIndex =
      state.votingCountryIndex + (isNextVotingCountry ? 1 : 0);
    const isJuryVotingOver =
      nextVotingCountryIndex === countriesStore.getVotingCountriesLength();

    const updatedCountries = currentStage.countries.map((country) => {
      if (country.code === countryCode) {
        return {
          ...country,
          juryPoints: country.juryPoints + state.votingPoints,
          points: country.points + state.votingPoints,
          lastReceivedPoints: state.votingPoints,
        };
      }

      return country;
    });

    if (
      isJuryVotingOver &&
      (currentStage.votingMode === StageVotingMode.JURY_ONLY ||
        currentStage.votingMode === StageVotingMode.COMBINED)
    ) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingCountryIndex: nextVotingCountryIndex,
        eventStages: state.eventStages.map((stage) => {
          if (stage.id === state.currentStageId) {
            return {
              ...stage,
              countries,
              isOver: true,
              isJuryVoting: false,
            };
          }

          return stage;
        }),
        shouldShowLastPoints: false,
        shouldClearPoints: true,
        winnerCountry,
        showQualificationResults,
      });

      return;
    }

    set({
      votingPoints: getNextVotingPoints(state.votingPoints),
      votingCountryIndex: isJuryVotingOver
        ? getLastCountryIndexByPoints(
            updatedCountries,
            getLastCountryCodeByPoints(
              getRemainingCountries(updatedCountries, countryCode),
            ),
          )
        : nextVotingCountryIndex,
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            isJuryVoting: !isJuryVotingOver,
            countries: updatedCountries,
          };
        }

        return stage;
      }),
      shouldShowLastPoints: !shouldReset,
    });
  },

  giveTelevotePoints: (countryCode: string, votingPoints: number) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    let updatedCountries = currentStage.countries.map((country) => {
      if (country.code === countryCode) {
        return {
          ...country,
          televotePoints: country.televotePoints + (votingPoints ?? 0),
          points: country.points + (votingPoints ?? 0),
          lastReceivedPoints: votingPoints ?? null,
          isVotingFinished: true,
        } as Country;
      }

      return country;
    });

    const lastCountryIndexByPoints = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, countryCode),
      ),
    );
    const isVotingFinished = isVotingOver(lastCountryIndexByPoints);

    let winnerCountry: Country | null = null;
    let showQualificationResults = false;

    if (isVotingFinished) {
      ({
        winnerCountry,
        showQualificationResults,
        countries: updatedCountries,
      } = handleStageEnd(updatedCountries, currentStage));
    }

    set({
      votingCountryIndex: lastCountryIndexByPoints,
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            countries: updatedCountries,
            isOver: isVotingFinished,
          };
        }

        return stage;
      }),
      shouldShowLastPoints: false,
      shouldClearPoints: true,
      winnerCountry,
      showQualificationResults,
      televotingProgress: state.televotingProgress + 1,
    });
  },

  giveRandomJuryPoints: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;
    const votingCountries = countriesStore.getVotingCountries();

    const isJuryVotingOver =
      state.votingCountryIndex === votingCountries.length - 1;
    const votingCountryCode = votingCountries[state.votingCountryIndex].code;

    const countriesWithRecentPoints: CountryWithPoints[] = [];
    const initialCountriesWithPointsLength = currentStage.countries.filter(
      (country) => country.lastReceivedPoints !== null,
    ).length;

    const pointsLeftArray = POINTS_ARRAY.filter(
      (points) => points >= state.votingPoints,
    );

    pointsLeftArray.forEach((points) => {
      const availableCountries = currentStage.countries.filter(
        (country) =>
          !countriesWithRecentPoints.some(
            (countryWithPoints) => countryWithPoints.code === country.code,
          ) &&
          country.code !== votingCountryCode &&
          (country.lastReceivedPoints === null ||
            initialCountriesWithPointsLength >= POINTS_ARRAY.length),
      );

      const randomCountryIndex = Math.floor(
        Math.random() * availableCountries.length,
      );
      const randomCountry = availableCountries[randomCountryIndex];

      if (randomCountry) {
        countriesWithRecentPoints.push({
          code: randomCountry.code,
          points,
        });
      }
    });

    const updatedCountries = currentStage.countries.map((country) => {
      const receivedPoints =
        countriesWithRecentPoints.find(
          (countryWithPoints) => countryWithPoints.code === country.code,
        )?.points || 0;

      return {
        ...country,
        juryPoints: country.juryPoints + receivedPoints,
        points: country.points + receivedPoints,
        lastReceivedPoints:
          receivedPoints ||
          (countriesWithRecentPoints.length >= POINTS_ARRAY.length
            ? null
            : country.lastReceivedPoints),
      };
    });

    if (
      isJuryVotingOver &&
      (currentStage.votingMode === StageVotingMode.JURY_ONLY ||
        currentStage.votingMode === StageVotingMode.COMBINED)
    ) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPoints: 1,
        votingCountryIndex: state.votingCountryIndex + 1,
        eventStages: state.eventStages.map((stage) => {
          if (stage.id === state.currentStageId) {
            return {
              ...stage,
              countries,
              isOver: true,
              isJuryVoting: false,
            };
          }

          return stage;
        }),
        shouldShowLastPoints: true,
        winnerCountry,
        showQualificationResults,
      });

      return;
    }

    const televoteCountryIndex = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, undefined),
      ),
    );

    set({
      votingPoints: 1,
      votingCountryIndex: isJuryVotingOver
        ? televoteCountryIndex
        : state.votingCountryIndex + 1,
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            isJuryVoting: !isJuryVotingOver,
            countries: updatedCountries,
          };
        }

        return stage;
      }),
      shouldShowLastPoints: true,
    });
  },

  finishJuryVotingRandomly: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    const votingCountries = countriesStore.getVotingCountries();
    let countriesLeft = votingCountries.length - state.votingCountryIndex;

    let updatedCountries = [...currentStage.countries];

    while (countriesLeft > 0) {
      const votingCountryCode =
        votingCountries[votingCountries.length - countriesLeft].code;

      const countriesWithRecentPoints: CountryWithPoints[] = [];

      const isCurrentVotingCountry =
        votingCountries.length - countriesLeft === state.votingCountryIndex;

      const pointsToGive = isCurrentVotingCountry
        ? POINTS_ARRAY.filter((p) => p >= state.votingPoints)
        : POINTS_ARRAY;

      pointsToGive.forEach((points) => {
        const availableCountries = updatedCountries.filter(
          (country) =>
            !countriesWithRecentPoints.some((c) => c.code === country.code) &&
            country.code !== votingCountryCode &&
            country.lastReceivedPoints === null,
        );

        const randomCountryIndex = Math.floor(
          Math.random() * availableCountries.length,
        );
        const randomCountry = availableCountries[randomCountryIndex];

        if (randomCountry) {
          countriesWithRecentPoints.push({
            code: randomCountry.code,
            points,
          });
        }
      });

      updatedCountries = updatedCountries.map((country) => {
        const receivedPoints =
          countriesWithRecentPoints.find((c) => c.code === country.code)
            ?.points || 0;

        return {
          ...country,
          juryPoints: country.juryPoints + receivedPoints,
          points: country.points + receivedPoints,
          lastReceivedPoints: receivedPoints || country.lastReceivedPoints,
        };
      });

      countriesLeft = countriesLeft - 1;

      if (countriesLeft > 0) {
        updatedCountries = updatedCountries.map((c) => ({
          ...c,
          lastReceivedPoints: null,
        }));
      }
    }

    const isStageOver =
      currentStage.votingMode === StageVotingMode.JURY_ONLY ||
      currentStage.votingMode === StageVotingMode.COMBINED;

    if (isStageOver) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      set({
        votingPoints: 1,
        votingCountryIndex: votingCountries.length,
        eventStages: state.eventStages.map((stage) =>
          stage.id === state.currentStageId
            ? { ...stage, countries, isOver: true, isJuryVoting: false }
            : stage,
        ),
        shouldShowLastPoints: false,
        winnerCountry,
        showQualificationResults,
      });
    } else {
      // Transition to televote
      const televoteCountryIndex = getLastCountryIndexByPoints(
        updatedCountries,
        getLastCountryCodeByPoints(
          getRemainingCountries(updatedCountries, undefined),
        ),
      );

      set({
        votingPoints: 1,
        votingCountryIndex: televoteCountryIndex,
        eventStages: state.eventStages.map((stage) =>
          stage.id === state.currentStageId
            ? {
                ...stage,
                countries: updatedCountries,
                isJuryVoting: false,
              }
            : stage,
        ),
        shouldShowLastPoints: false,
      });
    }
  },

  finishTelevoteVotingRandomly: () => {
    const state = get();
    const countriesStore = useCountriesStore.getState();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    const qualifiedCountries = countriesStore.getQualifiedCountries();
    const votingCountriesLength = countriesStore.getVotingCountriesLength();

    const filteredCountries = currentStage.countries.filter(
      (country) => !country.isVotingFinished,
    );
    const sortedCountries = [...filteredCountries].sort(
      (a, b) => b.points - a.points,
    );

    const updatedCountries = currentStage.countries.map((country) => {
      const countryFromRandomSort = sortedCountries.find(
        (c) => c.code === country.code,
      );

      if (!countryFromRandomSort) return country;

      const countryPlace =
        currentStage.countries.findIndex((c) => c.code === country.code) + 1;
      const randomVotingPoints = getRandomTelevotePoints(
        countryPlace,
        qualifiedCountries.length,
        votingCountriesLength,
      );

      return {
        ...country,
        televotePoints: country.televotePoints + randomVotingPoints,
        points: country.points + randomVotingPoints,
        isVotingFinished: true,
        lastReceivedPoints: randomVotingPoints ?? null,
      };
    });

    const {
      winnerCountry,
      showQualificationResults,
      countries: finalCountries,
    } = handleStageEnd(updatedCountries, currentStage);

    set({
      votingCountryIndex: -1,
      eventStages: state.eventStages.map((stage: EventStage) =>
        stage.id === state.currentStageId
          ? { ...stage, countries: finalCountries, isOver: true }
          : stage,
      ),
      shouldShowLastPoints: false,
      shouldClearPoints: true,
      winnerCountry,
      showQualificationResults,
      televotingProgress: state.televotingProgress + sortedCountries.length,
    });
  },
});
