import { ensureScoreboardEngine } from './engineLoader';
import { ScoreboardState } from './types';

/**
 * The action names installEngine.ts swaps in lazily. Must match the members
 * of VotingActions, JuryScaleRevealActions and PredefinitionActions — the
 * `satisfies` check on createEngineStubs' return type enforces it.
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

type AnyFn = (...args: unknown[]) => unknown;

/**
 * Placeholder actions the store boots with. A stub call before the engine has
 * installed loads it and replays the call (FIFO — every queued call and every
 * `await ensureScoreboardEngine()` chains on the same resolved promise);
 * after installation the store holds the real functions, and a stale stub
 * reference captured by a component simply delegates. The two
 * boolean-returning split-screen actions return `undefined` from a queued
 * call — their only callers live in simulation chunks, which install the
 * engine before mounting.
 */
export const createEngineStubs = (
  get: () => ScoreboardState,
): EngineStubActions => {
  const stubs = {} as Record<LazyEngineActionName, AnyFn>;

  for (const name of LAZY_ENGINE_ACTIONS) {
    stubs[name] = (...args: unknown[]) => {
      const current = get()[name] as AnyFn;

      if (current !== stubs[name]) return current(...args);

      void ensureScoreboardEngine().then(() => {
        (get()[name] as AnyFn)(...args);
      });

      return undefined;
    };
  }

  return stubs as unknown as EngineStubActions;
};
