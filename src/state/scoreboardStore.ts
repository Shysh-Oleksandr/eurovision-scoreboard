import isDeepEqual from 'fast-deep-equal';
import { temporal } from 'zundo';
import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import deepMerge from './deepMerge';
import { createEngineStubs } from './scoreboard/engineStubs';
import { createEventActions } from './scoreboard/eventActions';
import { createGetters } from './scoreboard/getters';
import { createMiscActions } from './scoreboard/miscActions';
import { initialScoreboardState } from './scoreboard/state';
import { ScoreboardState } from './scoreboard/types';

// The heavy action factories (voting, jury-scale reveal, predefinition — and
// through them the diaspora presets JSON) are NOT composed here: the store
// boots with stubs and installEngine.ts swaps the real implementations in via
// engineLoader. This store is on the render-critical boot path (layout →
// AppBootstrap → generalStore/countriesStore, and EventSetupModal reads it at
// first render), so everything imported here ships before first paint.
export const useScoreboardStore = create<ScoreboardState>()(
  temporal(
    devtools(
      persist(
        (set, get, store) =>
          ({
            ...createEventActions(set, get, store),
            ...createMiscActions(set, get, store),
            ...createGetters(set, get, store),
            ...createEngineStubs(get),

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
            isWinnerAnimationAlreadyDisplayed:
              state.isWinnerAnimationAlreadyDisplayed,
            // Must be persisted alongside the points it accounts for: a refresh
            // mid-countdown would otherwise restore the awarded points but reset
            // the cursor to step 0 and award every step a second time.
            juryScaleReveal: state.juryScaleReveal,
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
          juryScaleReveal,
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
          // Undo must roll the reveal cursor back together with the points it
          // awarded. `juryScaleRevealAwardsHidden` is deliberately excluded —
          // the hide timer would otherwise push a past-state that "undo" eats.
          juryScaleReveal,
        };
      },
    },
  ),
);
