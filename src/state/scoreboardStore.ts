import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { EventMode, StageId } from '../models';

import { createEventActions } from './scoreboard/eventActions';
import { createGetters } from './scoreboard/getters';
import { createMiscActions } from './scoreboard/miscActions';
import { createPredefinitionActions } from './scoreboard/predefinitionActions';
import { ScoreboardState } from './scoreboard/types';
import { createVotingActions } from './scoreboard/votingActions';

export const useScoreboardStore = create<ScoreboardState>()(
  devtools(
    (set, get, store) => ({
      ...createEventActions(set, get, store),
      ...createMiscActions(set, get, store),
      ...createVotingActions(set, get, store),
      ...createGetters(set, get, store),
      ...createPredefinitionActions(set, get, store),

      // Initial state
      eventStages: [],
      currentStageId: null,
      eventMode: EventMode.GRAND_FINAL_ONLY,
      votingCountryIndex: 0,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      showQualificationResults: false,
      restartCounter: 0,
      showAllParticipants: false,
      televotingProgress: 0,
      predefinedVotes: {
        [StageId.SF1]: {},
        [StageId.SF2]: {},
        [StageId.GF]: {},
      },
      hasShownManualTelevoteWarning: false,
    }),
    { name: 'scoreboard-store' },
  ),
);
