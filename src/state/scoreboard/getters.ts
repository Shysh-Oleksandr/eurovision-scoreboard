import { StateCreator } from 'zustand';

import { Country, EventStage, StageId } from '../../models';

import { ScoreboardState } from './types';

type Getters = {
  getCurrentStage: () => EventStage | undefined;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
};

export const createGetters: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  Getters
> = (_set, get) => ({
  getCurrentStage: () => {
    const state = get();
    const currentStage = state.eventStages.find(
      (s: EventStage) => s.id === state.currentStageId,
    );

    return currentStage;
  },

  getCountryInSemiFinal: (countryCode: string) => {
    const state = get();
    const stage = state.eventStages.find(
      (s: EventStage) =>
        s.countries.some((c: Country) => c.code === countryCode) &&
        s.id !== StageId.GF,
    );
    const country = stage?.countries.find(
      (c: Country) => c.code === countryCode,
    );

    return country ?? null;
  },
});
