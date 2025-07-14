import { StateCreator } from 'zustand';

import { EventStage, StageId } from '../../models';
import { useCountriesStore } from '../countriesStore';

import { ScoreboardState } from './types';
import { predefineStageVotes } from './votesPredefinition';

type PredefinitionActions = {
  predefineVotesForStage: (
    stage: EventStage,
    resetOtherStages?: boolean,
  ) => void;
};

export const createPredefinitionActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  PredefinitionActions
> = (set, get) => ({
  predefineVotesForStage: (stage: EventStage, resetOtherStages = false) => {
    const { selectedCountries, countryOdds } = useCountriesStore.getState();
    const { randomnessLevel } = get();

    const votingCountries =
      stage.id === StageId.GF ? selectedCountries : stage.countries;

    const predefinedVotes = predefineStageVotes(
      stage.countries,
      votingCountries,
      stage.votingMode,
      countryOdds,
      randomnessLevel,
    );

    set((state) => ({
      predefinedVotes: resetOtherStages
        ? {
            [stage.id]: predefinedVotes,
          }
        : {
            ...state.predefinedVotes,
            [stage.id]: predefinedVotes,
          },
    }));
  },
});
