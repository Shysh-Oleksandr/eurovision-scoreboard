import { StateCreator } from 'zustand';

import { Country, EventStage, StageVotingMode } from '../../models';
import { useCountriesStore } from '../countriesStore';
import { useGeneralStore } from '../generalStore';

import {
  getLastCountryCodeByPoints,
  getLastCountryIndexByPoints,
  getRemainingCountries,
  handleStageEnd,
} from './helpers';
import {
  getDouzeAwards,
  getDouzePointsIds,
  getJuryMatrix,
  getScaleSteps,
  getStepAwards,
  hasScaleStepsLeft,
  resolveJuryScaleRevealCursor,
  type JuryVoteMatrix,
} from './juryScaleReveal';
import { resolveStagePointsSystem } from './stageOverrides';
import { JuryScaleReveal, ScoreboardState } from './types';

import { ANIMATION_DURATION } from '@/data/data';
import {
  notifyThemeSoundStageFinished,
  playThemeSound,
  playThemeSoundPointsAwardedIfNonDouze,
} from '@/theme/playThemeSound';

/*
 * Store actions for the "scale countdown" jury reveal. Kept in its own slice so
 * `votingActions.ts` (already the largest file in the app) stays untouched — the
 * two flows never call into each other.
 */

type JuryScaleRevealActions = {
  advanceJuryScaleReveal: () => void;
  finishJuryScaleRevealRandomly: () => void;
  hideJuryScaleRevealAwards: () => void;
  resetJuryScaleReveal: () => void;
};

/**
 * Adds this batch's points to the board. Writes `juryPoints` and `points` for
 * every voting mode, exactly as `giveJuryPoints` does.
 *
 * `lastReceivedPoints` / `showDouzePointsAnimation` are deliberately left alone:
 * this board derives its own overlay, and leaving them untouched means nothing
 * stale appears when the normal scoreboard takes over for televote.
 */
const applyAwards = (
  countries: Country[],
  pointsByCountryCode: Record<string, number>,
): Country[] =>
  countries.map((country) => {
    const awarded = pointsByCountryCode[country.code];

    if (!awarded) return country;

    return {
      ...country,
      juryPoints: country.juryPoints + awarded,
      points: country.points + awarded,
    };
  });

const toPointsByCountryCode = (
  awards: Record<string, { points: number }>,
): Record<string, number> => {
  const result: Record<string, number> = {};

  Object.entries(awards).forEach(([countryCode, award]) => {
    result[countryCode] = award.points;
  });

  return result;
};

const mergePoints = (
  target: Record<string, number>,
  source: Record<string, number>,
): Record<string, number> => {
  const merged = { ...target };

  Object.entries(source).forEach(([countryCode, points]) => {
    merged[countryCode] = (merged[countryCode] ?? 0) + points;
  });

  return merged;
};

const isJuryTerminalStage = (stage: EventStage): boolean =>
  stage.votingMode === StageVotingMode.JURY_ONLY ||
  stage.votingMode === StageVotingMode.COMBINED;

export const createJuryScaleRevealActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  JuryScaleRevealActions
> = (set, get) => {
  const clearHideTimer = () => {
    const timerId = get().juryScaleRevealHideTimerId;

    if (timerId) {
      clearTimeout(timerId);
    }
  };

  /**
   * Show the overlay and schedule it to clear. Only the scale phase auto-hides —
   * during the douze phase the running totals stay up for the whole phase.
   */
  const showAwards = (shouldAutoHide: boolean) => {
    clearHideTimer();

    if (!shouldAutoHide) {
      set({
        juryScaleRevealAwardsHidden: false,
        juryScaleRevealHideTimerId: null,
      });

      return;
    }

    const timerId = setTimeout(() => {
      set({
        juryScaleRevealAwardsHidden: true,
        juryScaleRevealHideTimerId: null,
      });
    }, ANIMATION_DURATION);

    set({
      juryScaleRevealAwardsHidden: false,
      juryScaleRevealHideTimerId: timerId,
    });
  };

  /*
   * Mirrors the end-of-jury tail that already appears three times in
   * `votingActions.ts` (`giveJuryPoints`, `givePredefinedJuryPointsGrouped`,
   * `giveRandomJuryPoints`). Copied rather than extracted so this feature cannot
   * change the behaviour of the default flow.
   */
  const finishJuryVoting = (
    currentStage: EventStage,
    updatedCountries: Country[],
    nextCursor: JuryScaleReveal,
    /*
     * Applied in one `set` with the final award so undo cannot land between the
     * two. On a jury-terminal stage it leaves the spokesperson cursor past the
     * last voter, which is what keeps the accumulated douze overlay on screen.
     */
    finalVotingCountryIndex: number,
  ) => {
    if (isJuryTerminalStage(currentStage)) {
      const { winnerCountry, showQualificationResults, countries } =
        handleStageEnd(updatedCountries, currentStage);

      notifyThemeSoundStageFinished(currentStage, winnerCountry);

      set((state) => ({
        juryScaleReveal: nextCursor,
        votingPointsIndex: 0,
        votingCountryIndex: finalVotingCountryIndex,
        eventStages: state.eventStages.map((stage) =>
          stage.id === state.currentStageId
            ? { ...stage, countries, isOver: true, isJuryVoting: false }
            : stage,
        ),
        shouldShowLastPoints: true,
        winnerCountry,
        // This board runs no end-of-simulation animation to report completion
        // (the normal board flips the flag from `handleBoardTeleportAnimationComplete`),
        // so mark it done here or the flag would stay stuck at false.
        isLastSimulationAnimationFinished: true,
        showQualificationResults,
      }));

      return;
    }

    // JURY_AND_TELEVOTE: hand back to the normal scoreboard, positioned on the
    // country that opens the televote.
    const televoteCountryIndex = getLastCountryIndexByPoints(
      updatedCountries,
      getLastCountryCodeByPoints(
        getRemainingCountries(updatedCountries, undefined),
        currentStage.runningOrder,
      ),
    );

    set((state) => ({
      juryScaleReveal: nextCursor,
      votingPointsIndex: 0,
      votingCountryIndex: televoteCountryIndex,
      eventStages: state.eventStages.map((stage) =>
        stage.id === state.currentStageId
          ? { ...stage, isJuryVoting: false, countries: updatedCountries }
          : stage,
      ),
      shouldShowLastPoints: true,
    }));
  };

  /** Everything the actions need, or `null` when the reveal cannot run. */
  const readContext = () => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage || currentStage.isOver || !currentStage.isJuryVoting) {
      return null;
    }

    const matrix: JuryVoteMatrix | null = getJuryMatrix(
      currentStage,
      state.predefinedVotes,
    );

    if (!matrix) return null;

    const { pointsSystem } = resolveStagePointsSystem(
      currentStage,
      useGeneralStore.getState(),
    );
    const voters = useCountriesStore.getState().getStageVotingCountries();

    return {
      state,
      currentStage,
      matrix,
      voters,
      scaleSteps: getScaleSteps(pointsSystem),
      douzePointsIds: getDouzePointsIds(pointsSystem),
      cursor: resolveJuryScaleRevealCursor(state.juryScaleReveal, currentStage),
    };
  };

  return {
    advanceJuryScaleReveal: () => {
      const context = readContext();

      if (!context) return;

      const {
        state,
        currentStage,
        matrix,
        voters,
        scaleSteps,
        douzePointsIds,
        cursor,
      } = context;

      // ── The beat after the last douze: commit the stage ──
      if (cursor.phase === 'awaitingFinish') {
        finishJuryVoting(
          currentStage,
          currentStage.countries,
          { ...cursor, phase: 'done' },
          voters.length,
        );

        return;
      }

      // ── Scale phase: reveal every award of the next points value at once ──
      if (hasScaleStepsLeft(cursor, scaleSteps.length)) {
        const step = scaleSteps[cursor.stepIndex];
        const awards = getStepAwards(matrix, step.id, voters);
        const updatedCountries = applyAwards(
          currentStage.countries,
          toPointsByCountryCode(awards),
        );
        const nextStepIndex = cursor.stepIndex + 1;
        const isLastStep = nextStepIndex >= scaleSteps.length;

        playThemeSoundPointsAwardedIfNonDouze(false);

        // A points system with nothing flagged as douze has no spokesperson
        // phase — the countdown itself ends jury voting, still via the beat so
        // the final step stays readable.
        const isFinalReveal = isLastStep && douzePointsIds.size === 0;

        // The overlay normally clears itself a few seconds in; with
        // `keepJuryScaleRevealAwards` it stays until the next set replaces it.
        showAwards(
          !isFinalReveal &&
            !useGeneralStore.getState().settings.keepJuryScaleRevealAwards,
        );

        // Stay in `scale` even on the last step so its overlay survives; the
        // switch to `douze` happens on the next advance, which awards in the
        // same call rather than burning a click.
        set((s) => ({
          juryScaleReveal: {
            stageId: currentStage.id,
            phase: isFinalReveal ? 'awaitingFinish' : 'scale',
            stepIndex: nextStepIndex,
          },
          eventStages: s.eventStages.map((stage) =>
            stage.id === s.currentStageId
              ? { ...stage, countries: updatedCountries }
              : stage,
          ),
        }));

        return;
      }

      // ── Douze phase: one spokesperson per advance ──
      if (douzePointsIds.size === 0 || voters.length === 0) return;

      // Entering the phase resets the cursor onto the first spokesperson.
      const voterIndex =
        cursor.phase === 'scale' ? 0 : state.votingCountryIndex;

      if (voterIndex >= voters.length) return;

      const { totals } = getDouzeAwards(
        matrix,
        douzePointsIds,
        voters,
        voterIndex,
        voterIndex + 1,
      );
      const updatedCountries = applyAwards(currentStage.countries, totals);
      const nextVoterIndex = voterIndex + 1;
      const isLastVoter = nextVoterIndex >= voters.length;

      playThemeSound('douzePoints');
      showAwards(false);

      set((s) => ({
        juryScaleReveal: {
          stageId: currentStage.id,
          // Hold on the last douze instead of committing the stage, so the
          // televote board / results modal cannot bury the final award.
          phase: isLastVoter ? 'awaitingFinish' : 'douze',
          stepIndex: cursor.stepIndex,
        },
        votingCountryIndex: nextVoterIndex,
        eventStages: s.eventStages.map((stage) =>
          stage.id === s.currentStageId
            ? { ...stage, countries: updatedCountries }
            : stage,
        ),
      }));
    },

    /** Backs the shared "Finish randomly" button: apply everything still owed. */
    finishJuryScaleRevealRandomly: () => {
      const context = readContext();

      if (!context) return;

      const {
        state,
        currentStage,
        matrix,
        voters,
        scaleSteps,
        douzePointsIds,
        cursor,
      } = context;

      // Nothing left to award — the hotkey landed on the finish beat.
      if (cursor.phase === 'awaitingFinish') {
        finishJuryVoting(
          currentStage,
          currentStage.countries,
          { ...cursor, phase: 'done' },
          voters.length,
        );

        return;
      }

      let pending: Record<string, number> = {};

      if (cursor.phase === 'scale') {
        for (
          let { stepIndex } = cursor;
          stepIndex < scaleSteps.length;
          stepIndex += 1
        ) {
          pending = mergePoints(
            pending,
            toPointsByCountryCode(
              getStepAwards(matrix, scaleSteps[stepIndex].id, voters),
            ),
          );
        }
      }

      const firstPendingVoterIndex =
        cursor.phase === 'scale' ? 0 : state.votingCountryIndex;
      const { totals } = getDouzeAwards(
        matrix,
        douzePointsIds,
        voters,
        firstPendingVoterIndex,
        voters.length,
      );

      pending = mergePoints(pending, totals);

      showAwards(false);
      playThemeSoundPointsAwardedIfNonDouze(false);

      // Still stops on the beat: skipping ahead should not bury the 12s either.
      set((s) => ({
        juryScaleReveal: {
          stageId: currentStage.id,
          phase: 'awaitingFinish',
          stepIndex: scaleSteps.length,
        },
        votingCountryIndex: voters.length,
        eventStages: s.eventStages.map((stage) =>
          stage.id === s.currentStageId
            ? {
                ...stage,
                countries: applyAwards(currentStage.countries, pending),
              }
            : stage,
        ),
      }));
    },

    hideJuryScaleRevealAwards: () => {
      clearHideTimer();
      set({
        juryScaleRevealAwardsHidden: true,
        juryScaleRevealHideTimerId: null,
      });
    },

    resetJuryScaleReveal: () => {
      clearHideTimer();
      set({
        juryScaleReveal: null,
        juryScaleRevealAwardsHidden: false,
        juryScaleRevealHideTimerId: null,
      });
    },
  };
};
