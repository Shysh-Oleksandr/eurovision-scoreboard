import { StateCreator } from 'zustand';

import { ScoreboardState } from './types';

type MiscActions = {
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  toggleShowAllParticipants: () => void;
  setHasShownManualTelevoteWarning: (hasShown: boolean) => void;
  setRandomnessLevel: (level: number) => void;
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

  setHasShownManualTelevoteWarning: (hasShown: boolean) => {
    set({
      hasShownManualTelevoteWarning: hasShown,
    });
  },
  setRandomnessLevel: (level: number) => {
    set({ randomnessLevel: level });
  },
});
