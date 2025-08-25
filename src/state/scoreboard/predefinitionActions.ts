import { StateCreator } from 'zustand';

import { EventStage } from '../../models';
import { useCountriesStore } from '../countriesStore';
import { useGeneralStore } from '../generalStore';

import { ScoreboardState } from './types';
import { predefineStageVotes } from './votesPredefinition';

// Helper function to calculate and store country points from predefined votes
const calculateAndStoreCountryPoints = (
  stage: EventStage,
  predefinedVotes: any,
  set: any,
) => {
  const countryPoints: Record<string, any> = {};
  
  // Initialize all countries with 0 points
  stage.countries.forEach(country => {
    countryPoints[country.code] = {
      juryPoints: 0,
      televotePoints: 0,
      combinedPoints: 0,
    };
  });

  // Calculate jury points
  if (predefinedVotes.jury) {
    Object.values(predefinedVotes.jury).forEach((votes: any) => {
      votes.forEach((vote: any) => {
        if (countryPoints[vote.countryCode]) {
          countryPoints[vote.countryCode].juryPoints += vote.points;
        }
      });
    });
  }

  // Calculate televote points
  if (predefinedVotes.televote) {
    Object.values(predefinedVotes.televote).forEach((votes: any) => {
      votes.forEach((vote: any) => {
        if (countryPoints[vote.countryCode]) {
          countryPoints[vote.countryCode].televotePoints += vote.points;
        }
      });
    });
  }

  // Calculate combined points
  if (predefinedVotes.combined) {
    Object.values(predefinedVotes.combined).forEach((votes: any) => {
      votes.forEach((vote: any) => {
        if (countryPoints[vote.countryCode]) {
          countryPoints[vote.countryCode].combinedPoints += vote.points;
        }
      });
    });
  }

  // Store the calculated points
  set((s: any) => ({
    countryPoints: {
      ...s.countryPoints,
      [stage.id]: countryPoints,
    },
  }));
};

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
> = (set) => ({
  predefineVotesForStage: (stage: EventStage, resetOtherStages = false) => {
    const { countryOdds, getStageVotingCountries } =
      useCountriesStore.getState();
    const { pointsSystem, settings: {randomnessLevel} } = useGeneralStore.getState();

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

    // Calculate and store country points for this stage
    calculateAndStoreCountryPoints(stage, predefinedVotes, set);
  },
});
