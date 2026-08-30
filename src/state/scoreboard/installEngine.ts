import { useScoreboardStore } from '../scoreboardStore';

import { createJuryScaleRevealActions } from './juryScaleRevealActions';
import { createPredefinitionActions } from './predefinitionActions';
import { createVotingActions } from './votingActions';

/**
 * The lazy chunk root: statically imports the heavy action factories and
 * swaps their implementations over the boot-time stubs (engineStubs.ts).
 * Reached only through engineLoader's `import()` — importing this module from
 * anywhere eager would drag the whole engine back into the boot chunk.
 *
 * The factories receive the store-level setState/getState, which route
 * through the same temporal → devtools → persist middleware chain as the
 * creator-scope `set`/`get` they were written for. The injection write itself
 * adds no undo history entry: zundo's partialize keeps data keys only, so the
 * action swap partializes equal and the equality check suppresses it.
 */
let installed = false;

export function installScoreboardEngine(): void {
  if (installed) return;
  installed = true;

  const set = useScoreboardStore.setState;
  const get = useScoreboardStore.getState;

  useScoreboardStore.setState(
    {
      ...createVotingActions(set, get, useScoreboardStore),
      ...createJuryScaleRevealActions(set, get, useScoreboardStore),
      ...createPredefinitionActions(set, get, useScoreboardStore),
    },
    false,
    'scoreboard/installEngine',
  );
}
