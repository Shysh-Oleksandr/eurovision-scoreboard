import { StateCreator } from 'zustand';

import { EventStage } from '../../models';
import { useCountriesStore } from '../countriesStore';
import { useGeneralStore } from '../generalStore';

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
    const { countryOdds, getStageVotingCountries } =
      useCountriesStore.getState();
    const { pointsSystem } = useGeneralStore.getState();

    const { randomnessLevel } = get();

    const votingCountries = getStageVotingCountries(stage.id);

    const predefinedVotes = predefineStageVotes(
      stage.countries,
      votingCountries,
      stage.votingMode,
      countryOdds,
      randomnessLevel,
      pointsSystem,
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
