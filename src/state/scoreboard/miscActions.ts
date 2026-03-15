import { StateCreator } from 'zustand';

import { ScoreboardState } from './types';

import { ANIMATION_DURATION } from '@/data/data';

type MiscActions = {
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  toggleShowAllParticipants: () => void;
  setViewedStageId: (stageId: string | null) => void;
  setCurrentStageId: (stageId: string | null) => void;
  hideDouzePointsAnimation: (countryCode: string) => void;
  setBoardTeleportAnimationRunning: (isRunning: boolean) => void;
  setShouldResetLastPointsAfterTeleport: (shouldReset: boolean) => void;
  handleBoardTeleportAnimationComplete: (hasDouzePointsAnimation: boolean) => void;
  setIsLastSimulationAnimationFinished: (isFinished: boolean) => void;
  setCurrentRevealTelevotePoints: (points: number) => void;
  setIsWinnerAnimationAlreadyDisplayed: (hasShown: boolean) => void;
};

const FINAL_SIMULATION_ANIMATION_FINISH_DELAY_MS = 500;

export const createMiscActions: StateCreator<
  ScoreboardState,
  [['zustand/devtools', never]],
  [],
  MiscActions
> = (set, get) => ({
  resetLastPoints: () => {
    const state = get();
    const currentStage = state.eventStages.find(
      (s) => s.id === state.currentStageId,
    );

    if (!currentStage) return;

    set({
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            countries: stage.countries.map((country) => ({
              ...country,
              lastReceivedPoints: null,
              showDouzePointsAnimation: false,
            })),
          };
        }

        return stage;
      }),
    });
  },

  hideLastReceivedPoints: () => {
    set({
      shouldShowLastPoints: false,
    });
  },

  toggleShowAllParticipants: () => {
    set((state) => ({
      showAllParticipants: !state.showAllParticipants,
    }));
  },

  setViewedStageId: (stageId: string | null) => {
    set({
      viewedStageId: stageId,
    });
  },

  setCurrentStageId: (stageId: string | null) => {
    set({
      currentStageId: stageId,
    });
  },

  setIsWinnerAnimationAlreadyDisplayed: (hasShown: boolean) => {
    set({
      isWinnerAnimationAlreadyDisplayed: hasShown,
    });
  },
  hideDouzePointsAnimation: (countryCode: string) => {
    const state = get();
    const currentStage = state.getCurrentStage();

    if (!currentStage) return;

    set({
      eventStages: state.eventStages.map((stage) => {
        if (stage.id === state.currentStageId) {
          return {
            ...stage,
            countries: stage.countries.map((country) =>
              country.code === countryCode
                ? { ...country, showDouzePointsAnimation: false }
                : country,
            ),
          };
        }

        return stage;
      }),
    });
  },

  setBoardTeleportAnimationRunning: (isRunning: boolean) => {
    set({
      isBoardTeleportAnimationRunning: isRunning,
    });
  },

  setShouldResetLastPointsAfterTeleport: (shouldReset: boolean) => {
    set({
      shouldResetLastPointsAfterTeleport: shouldReset,
    });
  },

  setIsLastSimulationAnimationFinished: (isFinished: boolean) => {
    set({
      isLastSimulationAnimationFinished: isFinished,
    });
  },

  handleBoardTeleportAnimationComplete: (hasDouzePointsAnimation: boolean) => {
    const state = get();
    if (state.winnerCountry && !state.isLastSimulationAnimationFinished) {
      setTimeout(() => {
        get().setIsLastSimulationAnimationFinished(true);
      }, FINAL_SIMULATION_ANIMATION_FINISH_DELAY_MS);
    }

    if (!state.shouldResetLastPointsAfterTeleport) {
      set({
        isBoardTeleportAnimationRunning: false,
      });
      return;
    }

    if (state.lastPointsResetTimerId) {
      clearTimeout(state.lastPointsResetTimerId);
    }

    if (hasDouzePointsAnimation) {
      const timerId = setTimeout(() => {
        get().resetLastPoints();
        set({ lastPointsResetTimerId: null });
      }, ANIMATION_DURATION);

      set({
        isBoardTeleportAnimationRunning: false,
        shouldResetLastPointsAfterTeleport: false,
        lastPointsResetTimerId: timerId,
      });
      return;
    }

    get().resetLastPoints();
    set({
      isBoardTeleportAnimationRunning: false,
      shouldResetLastPointsAfterTeleport: false,
      lastPointsResetTimerId: null,
    });
  },

  setCurrentRevealTelevotePoints: (points: number) => {
    set({
      currentRevealTelevotePoints: points,
    });
  },
});
