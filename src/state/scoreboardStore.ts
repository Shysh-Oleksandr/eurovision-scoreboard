import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import { EventMode } from '../models';

import { createEventActions } from './scoreboard/eventActions';
import { createGetters } from './scoreboard/getters';
import { createMiscActions } from './scoreboard/miscActions';
import { ScoreboardState } from './scoreboard/types';
import { createVotingActions } from './scoreboard/votingActions';

export const useScoreboardStore = create<ScoreboardState>()(
  devtools(
    (set, get, api) => ({
      // Initial state
      eventStages: [],
      currentStageId: null,
      votingCountryIndex: 0,
      votingPoints: 1,
      shouldShowLastPoints: true,
      shouldClearPoints: false,
      winnerCountry: null,
      eventMode: EventMode.GRAND_FINAL_ONLY,
      showQualificationResults: false,
      restartCounter: 0,
      showAllParticipants: false,
      televotingProgress: 0,

      // Actions
      ...createGetters(set, get, api),
      ...createEventActions(set, get, api),
      ...createVotingActions(set, get, api),
      ...createMiscActions(set, get, api),
    }),
    { name: 'scoreboard-store' },
  ),
);
