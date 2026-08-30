import { ensureScoreboardEngine } from './engineLoader';
import type { JuryScaleRevealActions } from './juryScaleRevealActions';
import type { PredefinitionActions } from './predefinitionActions';
import { ScoreboardState } from './types';
import type { VotingActions } from './votingActions';

/**
 * The action names installEngine.ts swaps in lazily. The `_namesMatchEngine`
 * assertion below fails to compile if this list and the three factories'
 * action types drift in either direction (a name here that no factory
 * installs would otherwise leave a stub that re-queues itself forever; a
 * factory member missing here would boot as `undefined`).
 */
const LAZY_ENGINE_ACTIONS = [
  // votingActions
  'giveJuryPoints',
  'giveTelevotePoints',
  'commitPendingFinalRevealTelevote',
  'giveRandomJuryPoints',
  'finishJuryVotingRandomly',
  'finishTelevoteVotingRandomly',
  'givePredefinedJuryPoint',
  'givePredefinedJuryPointsGrouped',
  'givePredefinedTelevotePoints',
  'giveManualTelevotePointsInRevealMode',
  'pickQualifier',
  'pickQualifierRandomly',
  'openSplitScreenQualifierModal',
  'closeSplitScreenQualifierModal',
  'computeSplitScreenQualifierCandidatesIfNeeded',
  'pickQualifierFromSplitScreenCandidatesRandomly',
  // juryScaleRevealActions
  'advanceJuryScaleReveal',
  'finishJuryScaleRevealRandomly',
  'hideJuryScaleRevealAwards',
  'resetJuryScaleReveal',
  // predefinitionActions
  'predefineVotesForStage',
  'setPredefinedVotesForStage',
  'setManualShareTotalsForStage',
] as const;

export type LazyEngineActionName = (typeof LAZY_ENGINE_ACTIONS)[number];
export type EngineStubActions = Pick<ScoreboardState, LazyEngineActionName>;

type LazyEngineActions = VotingActions &
  JuryScaleRevealActions &
  PredefinitionActions;
type MissingFromList = Exclude<keyof LazyEngineActions, LazyEngineActionName>;
type ExtraInList = Exclude<LazyEngineActionName, keyof LazyEngineActions>;
// Compile-time two-way check: both Exclude results must be never.
const _namesMatchEngine: [MissingFromList, ExtraInList] extends [never, never]
  ? true
  : never = true;

void _namesMatchEngine;

/**
 * These return a value their caller branches on (e.g. PresentationPanel's
 * `didOpenModal`), so replaying them later would act on a decision the caller
 * already took the other way (a split-screen modal popping open after a
 * random pick was already made). Their stubs kick the engine load but do NOT
 * queue a replay — the pre-install call degrades to a no-op returning
 * `undefined`.
 */
const NON_REPLAYED_ACTIONS: ReadonlySet<LazyEngineActionName> = new Set([
  'openSplitScreenQualifierModal',
  'computeSplitScreenQualifierCandidatesIfNeeded',
]);

type AnyFn = (...args: unknown[]) => unknown;

/**
 * Placeholder actions the store boots with. A stub call before the engine has
 * installed loads it and replays the call (FIFO — every queued call and every
 * `await ensureScoreboardEngine()` chains on the same resolved promise);
 * after installation the store holds the real functions, and a stale stub
 * reference captured by a component simply delegates. The name list is
 * compile-checked against the factories' types above; the queued replay also
 * runtime-guards against invoking a still-stubbed action, so a drifted build
 * can never enter a self-call loop.
 */
export const createEngineStubs = (
  get: () => ScoreboardState,
): EngineStubActions => {
  const stubs = {} as Record<LazyEngineActionName, AnyFn>;

  for (const name of LAZY_ENGINE_ACTIONS) {
    stubs[name] = (...args: unknown[]) => {
      const current = get()[name] as AnyFn;

      if (current !== stubs[name]) return current(...args);

      if (NON_REPLAYED_ACTIONS.has(name)) {
        void ensureScoreboardEngine();

        return undefined;
      }

      void ensureScoreboardEngine().then(() => {
        const installed = get()[name] as AnyFn;

        if (installed !== stubs[name]) installed(...args);
      });

      return undefined;
    };
  }

  return stubs as unknown as EngineStubActions;
};
