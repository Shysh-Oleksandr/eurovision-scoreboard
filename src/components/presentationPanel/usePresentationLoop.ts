import { useEffect, useRef } from 'react';

import { useShallow } from 'zustand/shallow';

import { douzeDurationScale } from '@/douze/options';
import { EventStage, StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { isJuryScaleRevealActive } from '@/state/scoreboard/juryScaleReveal';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { resolveThemeSpecificsForGeneralState } from '@/theme/themeSpecifics';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

export const MIN_SPEED_SECONDS = 0.5;
export const MAX_SPEED_SECONDS = 7.5;

/**
 * Whether the scale-countdown reveal owns this stage's jury vote. Read from the
 * stores at call time so the auto-presentation loop and the rendered board can
 * never disagree about which flow drives the next award.
 */
const isScaleRevealRunning = (stage: EventStage): boolean => {
  const { settings } = useGeneralStore.getState();
  const {
    juryScaleReveal,
    votingCountryIndex,
    votingPointsIndex,
    viewedStageId,
    showAllParticipants,
  } = useScoreboardStore.getState();

  return isJuryScaleRevealActive({
    stage,
    enableJuryScaleReveal: settings.enableJuryScaleReveal,
    isPickQualifiersMode: settings.isPickQualifiersMode,
    juryScaleReveal,
    votingCountryIndex,
    votingPointsIndex,
    viewedStageId,
    showAllParticipants,
  });
};

/**
 * The auto-presentation engine: while `presentationSettings.isPresenting` is
 * on, awards the next predefined point (or group, televote entry, qualifier)
 * and reschedules itself with the speed read at schedule time. Mount it once,
 * in whichever layout renders the presentation controls.
 */
export const usePresentationLoop = () => {
  const { boardAnimationMode } = useThemeSpecifics();

  // The loop only schedules from these stage facts; subscribing to them
  // (rather than to a parent-driven `getCurrentStage()` call) keeps the host
  // out of per-award commits while still restarting the loop at stage/phase
  // changes.
  const { stageId, stageIsJuryVoting, stageIsOver } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return {
        stageId: stage?.id,
        stageIsJuryVoting: stage?.isJuryVoting,
        stageIsOver: stage?.isOver,
      };
    }),
  );

  const {
    getCurrentStage,
    givePredefinedJuryPoint,
    givePredefinedJuryPointsGrouped,
    givePredefinedTelevotePoints,
    openSplitScreenQualifierModal,
    pickQualifierFromSplitScreenCandidatesRandomly,
    pickQualifierRandomly,
  } = useScoreboardStore(
    useShallow((state) => ({
      getCurrentStage: state.getCurrentStage,
      givePredefinedJuryPoint: state.givePredefinedJuryPoint,
      givePredefinedJuryPointsGrouped: state.givePredefinedJuryPointsGrouped,
      givePredefinedTelevotePoints: state.givePredefinedTelevotePoints,
      openSplitScreenQualifierModal: state.openSplitScreenQualifierModal,
      pickQualifierFromSplitScreenCandidatesRandomly:
        state.pickQualifierFromSplitScreenCandidatesRandomly,
      pickQualifierRandomly: state.pickQualifierRandomly,
    })),
  );

  const {
    isPresenting,
    isPickQualifiersMode,
    enableSplitScreenQualifierRevealMode,
  } = useGeneralStore(
    useShallow((s) => ({
      isPresenting: s.presentationSettings.isPresenting,
      isPickQualifiersMode: s.settings.isPickQualifiersMode,
      enableSplitScreenQualifierRevealMode:
        s.settings.enableSplitScreenQualifierRevealMode,
    })),
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPresenting) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      return;
    }

    if (!stageId || stageIsOver) {
      return;
    }

    // Single-step executor that reschedules itself after completion
    const runOnce = () => {
      const latestStage = getCurrentStage();
      const generalStore = useGeneralStore.getState();

      const {
        presentationJuryGrouping,
        presentationSpeedSeconds,
        pauseAfterAnimatedPoints,
      } = generalStore.presentationSettings;

      if (!latestStage || latestStage.isOver) return;

      let isScaleRevealStep = false;

      const getNextDelayMs = (awardedAnimated: boolean) => {
        const baseSeconds = MAX_SPEED_SECONDS - presentationSpeedSeconds;
        // A theme that slows its douze animation down ("Customize
        // animation") gets a longer pause, so the next point waits for it.
        const douzeStretch = Math.max(
          1,
          douzeDurationScale(
            resolveThemeSpecificsForGeneralState(generalStore).douzeOptions,
          ),
        );
        const delayAfterAnimation = pauseAfterAnimatedPoints
          ? Math.max(
              (boardAnimationMode === 'teleport' ? 6 : 4.5) * douzeStretch,
              baseSeconds,
            )
          : baseSeconds;
        const nextDelaySeconds = awardedAnimated
          ? delayAfterAnimation
          : baseSeconds;

        return Math.max(MIN_SPEED_SECONDS, nextDelaySeconds) * 1000;
      };

      if (
        generalStore.settings.isPickQualifiersMode &&
        latestStage.id.toUpperCase() !== StageId.GF.toUpperCase()
      ) {
        const isSplitScreenEnabled =
          generalStore.settings.enableSplitScreenQualifierRevealMode;

        if (isSplitScreenEnabled) {
          const didOpenModal = openSplitScreenQualifierModal();
          const nextDelay = getNextDelayMs(false);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          if (!didOpenModal) {
            pickQualifierRandomly();
            timeoutRef.current = setTimeout(runOnce, nextDelay);

            return;
          }

          timeoutRef.current = setTimeout(() => {
            pickQualifierFromSplitScreenCandidatesRandomly();

            timeoutRef.current = setTimeout(runOnce, nextDelay);
          }, nextDelay);

          return;
        }

        pickQualifierRandomly();
      } else if (isScaleRevealRunning(latestStage)) {
        useScoreboardStore.getState().advanceJuryScaleReveal();
        isScaleRevealStep = true;
      } else if (latestStage.isJuryVoting) {
        if (presentationJuryGrouping === 'grouped') {
          givePredefinedJuryPointsGrouped();
        } else {
          givePredefinedJuryPoint();
        }
      } else {
        givePredefinedTelevotePoints();
      }

      // Schedule next cycle with the latest speed read at schedule time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // If the just-awarded batch contains an animated point, add +2s delay.
      // The scale reveal never sets `showDouzePointsAnimation` (it renders its
      // own overlay), so its douze steps are detected from the reveal phase.
      const scoreboardState = useScoreboardStore.getState();
      const awardedAnimated = isScaleRevealStep
        ? scoreboardState.juryScaleReveal?.phase !== 'scale'
        : scoreboardState
            .getCurrentStage()
            ?.countries?.some((c) => c.showDouzePointsAnimation);
      const nextDelay = getNextDelayMs(!!awardedAnimated);

      timeoutRef.current = setTimeout(runOnce, nextDelay);
    };

    // Start the loop
    const initialDelay = 1000;

    timeoutRef.current = setTimeout(runOnce, initialDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPresenting,
    stageId,
    stageIsJuryVoting,
    isPickQualifiersMode,
    enableSplitScreenQualifierRevealMode,
    boardAnimationMode,
  ]);
};
