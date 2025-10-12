import isDeepEqual from 'fast-deep-equal';
import { temporal } from 'zundo';
import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';
import deepMerge from '@75lb/deep-merge';

import { createEventActions } from './scoreboard/eventActions';
import { createGetters } from './scoreboard/getters';
import { createMiscActions } from './scoreboard/miscActions';
import { createPredefinitionActions } from './scoreboard/predefinitionActions';
import { initialScoreboardState } from './scoreboard/state';
import { ScoreboardState } from './scoreboard/types';
import { createVotingActions } from './scoreboard/votingActions';

export const useScoreboardStore = create<ScoreboardState>()(
  temporal(
    devtools(
      persist(
        (set, get, store) =>
          ({
            ...createEventActions(set, get, store),
            ...createMiscActions(set, get, store),
            ...createVotingActions(set, get, store),
            ...createGetters(set, get, store),
            ...createPredefinitionActions(set, get, store),

            ...initialScoreboardState,
          } as ScoreboardState),
        {
          name: 'scoreboard-storage',
          merge: (persistedState, currentState) =>
            deepMerge(currentState, persistedState),
          partialize: (state) => ({
            eventStages: state.eventStages,
            currentStageId: state.currentStageId,
            votingCountryIndex: state.votingCountryIndex,
            votingPointsIndex: state.votingPointsIndex,
            viewedStageId: state.viewedStageId,
            winnerCountry: state.winnerCountry,
            showAllParticipants: state.showAllParticipants,
            televotingProgress: state.televotingProgress,
            predefinedVotes: state.predefinedVotes,
            countryPoints: state.countryPoints,
            qualificationOrder: state.qualificationOrder,
            currentRevealTelevotePoints: state.currentRevealTelevotePoints,
            isWinnerAnimationAlreadyDisplayed: state.isWinnerAnimationAlreadyDisplayed,
          }),
        },
      ),
      {
        name: 'scoreboard-store',
        enabled: process.env.NODE_ENV === 'development',
      },
    ),
    {
      limit: 100,
      equality: (pastState, currentState) =>
        isDeepEqual(pastState, currentState),
      partialize: (state: ScoreboardState) => {
        const {
          eventStages,
          currentStageId,
          votingCountryIndex,
          votingPointsIndex,
          televotingProgress,
          winnerCountry,
          showQualificationResults,
          predefinedVotes,
          countryPoints,
          qualificationOrder,
        } = state;

        return {
          eventStages,
          currentStageId,
          votingCountryIndex,
          votingPointsIndex,
          televotingProgress,
          winnerCountry,
          showQualificationResults,
          predefinedVotes,
          countryPoints,
          qualificationOrder,
        };
      },
    },
  ),
);
