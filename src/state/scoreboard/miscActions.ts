import { StateCreator } from 'zustand';

import { ScoreboardState } from './types';

type MiscActions = {
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  toggleShowAllParticipants: () => void;
  setViewedStageId: (stageId: string | null) => void;
  setCurrentStageId: (stageId: string | null) => void;
  setHasShownManualTelevoteWarning: (hasShown: boolean) => void;
  setRandomnessLevel: (level: number) => void;
  hideDouzePointsAnimation: (countryCode: string) => void;
};

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

  setHasShownManualTelevoteWarning: (hasShown: boolean) => {
    set({
      hasShownManualTelevoteWarning: hasShown,
    });
  },
  setRandomnessLevel: (level: number) => {
    set({ randomnessLevel: level });
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
});
