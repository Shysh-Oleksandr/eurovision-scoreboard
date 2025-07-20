import isDeepEqual from 'fast-deep-equal';
import { temporal } from 'zundo';
import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

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
      (set, get, store) => ({
        ...createEventActions(set, get, store),
        ...createMiscActions(set, get, store),
        ...createVotingActions(set, get, store),
        ...createGetters(set, get, store),
        ...createPredefinitionActions(set, get, store),

        ...initialScoreboardState,
      }),
      { name: 'scoreboard-store' },
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
          votingPoints,
          televotingProgress,
          winnerCountry,
          showQualificationResults,
          predefinedVotes,
        } = state;

        return {
          eventStages,
          currentStageId,
          votingCountryIndex,
          votingPoints,
          televotingProgress,
          winnerCountry,
          showQualificationResults,
          predefinedVotes,
        };
      },
    },
  ),
);
