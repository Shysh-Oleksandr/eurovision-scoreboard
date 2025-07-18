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
);
