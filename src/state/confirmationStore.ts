import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ConfirmationPreferences {
  [confirmationKey: string]: {
    dontShowAgain: boolean;
    lastShown?: Date;
  };
}

interface ConfirmationStore {
  preferences: ConfirmationPreferences;
  setDontShowAgain: (key: string, value: boolean) => void;
  resetConfirmation: (key: string) => void;
  resetAllConfirmations: () => void;
  shouldShowConfirmation: (key: string) => boolean;
}

export const useConfirmationStore = create<ConfirmationStore>()(
  devtools(
    persist(
      (set, get) => ({
        preferences: {},

        setDontShowAgain: (key: string, value: boolean) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              [key]: {
                ...state.preferences[key],
                dontShowAgain: value,
                lastShown: new Date(),
              },
            },
          }));
        },

        resetConfirmation: (key: string) => {
          set((state) => {
            const newPreferences = { ...state.preferences };
            delete newPreferences[key];
            return { preferences: newPreferences };
          });
        },

        resetAllConfirmations: () => {
          set({ preferences: {} });
        },

        shouldShowConfirmation: (key: string) => {
          const preference = get().preferences[key];
          return !preference?.dontShowAgain;
        },
      }),
      {
        name: 'confirmation-store',
      },
    ),
    { name: 'confirmation-store', enabled: process.env.NODE_ENV === 'development' },
  ),
);
