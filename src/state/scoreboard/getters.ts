import { StateCreator } from 'zustand';

import { Country, EventStage, StageId } from '../../models';

import { ScoreboardState } from './types';

type Getters = {
  getCurrentStage: () => EventStage | undefined;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
};

// Cache for getCurrentStage
const currentStageCache = new WeakMap<
  EventStage[],
  Map<string | null, EventStage | undefined>
>();

// Cache for getCountryInSemiFinal
const semiFinalCountriesCache = new WeakMap<
  EventStage[],
  Map<string, Country>
>();

export const createGetters: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  Getters
> = (_set, get) => ({
  getCurrentStage: () => {
    const { eventStages, currentStageId } = get();

    if (!currentStageCache.has(eventStages)) {
      currentStageCache.set(eventStages, new Map());
    }
    const stageMap = currentStageCache.get(eventStages)!;

    if (!stageMap.has(currentStageId)) {
      const stage = eventStages.find((s) => s.id === currentStageId);

      stageMap.set(currentStageId, stage);
    }

    return stageMap.get(currentStageId);
  },

  getCountryInSemiFinal: (countryCode: string) => {
    const { eventStages } = get();

    if (!semiFinalCountriesCache.has(eventStages)) {
      const newCache = new Map<string, Country>();

      for (const stage of eventStages) {
        if (stage.id !== StageId.GF) {
          for (const country of stage.countries) {
            if (!newCache.has(country.code)) {
              newCache.set(country.code, country);
            }
          }
        }
      }
      semiFinalCountriesCache.set(eventStages, newCache);
    }

    const countryMap = semiFinalCountriesCache.get(eventStages);

    return countryMap?.get(countryCode) ?? null;
  },
});
