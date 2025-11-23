import { StateCreator } from 'zustand';

import { Country, EventStage, StageId } from '../../models';
import { useGeneralStore } from '../generalStore';

import { ScoreboardState } from './types';

type Getters = {
  getVotingPoints: () => number;
  getCurrentStage: () => EventStage | undefined;
  getNextStage: () => EventStage | null;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
};

export const createGetters: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  Getters
> = (_set, get) => ({
  getVotingPoints: () => {
    const { votingPointsIndex } = get();
    const { pointsSystem } = useGeneralStore.getState();

    if (votingPointsIndex > pointsSystem.length - 1)
      return pointsSystem[pointsSystem.length - 1]?.value ?? 0;

    return pointsSystem[votingPointsIndex]?.value ?? 0;
  },

  getCurrentStage: () => {
    const { eventStages, currentStageId } = get();
    return eventStages.find((s) => s.id === currentStageId);
  },

  getNextStage: () => {
    const { eventStages, currentStageId } = get();

    const currentStageIndex = eventStages.findIndex(
      (s: EventStage) => s.id === currentStageId,
    );

    const nextStage =
      currentStageIndex !== -1 ? eventStages?.[currentStageIndex + 1] : null;

    return nextStage;
  },

  getCountryInSemiFinal: (countryCode: string) => {
    const { eventStages } = get();

    for (const stage of eventStages) {
      if (stage.id !== StageId.GF) {
        const country = stage.countries.find((c) => c.code === countryCode);
        if (country) {
          return country;
        }
      }
    }

    return null;
  },

  getNextLowestTelevoteCountry: () => {
    const { getCurrentStage, countryPoints } = get();
    const currentStage = getCurrentStage();

    if (!currentStage) return null;

    const notFinishedCountries = Object.entries(
      countryPoints[currentStage.id],
    ).filter(
      ([code]) =>
        !currentStage.countries.find((country) => country.code === code)
          ?.isVotingFinished,
    );

    if (notFinishedCountries.length === 0) return null;

    const nextLowestTelevoteCountry = notFinishedCountries.reduce(
      (prev, current) => {
        if (current[1].televotePoints < prev[1].televotePoints) {
          return current;
        }
        if (current[1].televotePoints > prev[1].televotePoints) {
          return prev;
        }

        return prev;
      },
    );

    const country =
      currentStage.countries.find(
        (country) => country.code === nextLowestTelevoteCountry?.[0],
      ) ?? null;

    return {
      country,
      points: nextLowestTelevoteCountry?.[1]?.televotePoints ?? 0,
    };
  },
});
