import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';
import { Year } from '../config';
import { SUPPORTED_YEARS } from '../data/data';
import { getThemeForYear } from '../theme/themes';
import { Theme } from '../theme/types';

import { useCountriesStore } from './countriesStore';

export const INITIAL_YEAR = '2025' as Year;

interface Settings {
  alwaysShowRankings: boolean;
  showRankChangeIndicator: boolean;
  showQualificationModal: boolean;
  showWinnerModal: boolean;
  showWinnerConfetti: boolean;
  enableFullscreen: boolean;
  shouldShowBeforeUnloadWarning: boolean;
  shouldShowResetWarning: boolean;
  shouldShowManualTelevoteWarning: boolean;
}

interface GeneralState {
  lastSeenUpdate: string | null;
  shouldShowNewChangesIndicator: boolean;
  year: Year;
  themeYear: Year;
  theme: Theme;
  settings: Settings;
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
  setYear: (year: Year) => void;
  setTheme: (year: Year) => void;
  setSettings: (settings: Partial<Settings>) => void;
}

const getLatestUpdate = () => {
  const [latest] = WHATS_NEW;

  if (latest) {
    return `${latest.date}-${latest.title}`;
  }

  return null;
};

export const useGeneralStore = create<GeneralState>()(
  persist(
    (set, get) => ({
      lastSeenUpdate: null,
      shouldShowNewChangesIndicator: false,
      year: INITIAL_YEAR,
      themeYear: INITIAL_YEAR,
      theme: getThemeForYear(INITIAL_YEAR),
      settings: {
        alwaysShowRankings: true,
        showRankChangeIndicator: true,
        showQualificationModal: true,
        showWinnerModal: true,
        showWinnerConfetti: true,
        enableFullscreen: false,
        shouldShowBeforeUnloadWarning: true,
        shouldShowResetWarning: true,
        shouldShowManualTelevoteWarning: true,
      },

      setLastSeenUpdate: (update: string) => {
        set({ lastSeenUpdate: update });
      },
      setShouldShowNewChangesIndicator: (show: boolean) => {
        set({ shouldShowNewChangesIndicator: show });
      },
      checkForNewUpdates: () => {
        const latestUpdate = getLatestUpdate();
        const { lastSeenUpdate } = get();

        if (latestUpdate && lastSeenUpdate !== latestUpdate) {
          set({ shouldShowNewChangesIndicator: true });
        }
      },
      setYear: (year: Year) => {
        set({
          year: year,
        });

        useCountriesStore.getState().updateCountriesForYear(year);
      },
      setTheme: (year: Year) => {
        // Remove all theme classes
        document.documentElement.classList.remove(
          ...SUPPORTED_YEARS.map((y) => `theme-${y}`),
        );
        // Add the new theme class
        document.documentElement.classList.add(`theme-${year}`);

        set({
          themeYear: year,
          theme: getThemeForYear(year),
        });
      },
      setSettings: (settings: Partial<Settings>) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },
    }),
    {
      name: 'general-storage',
      partialize(state) {
        return {
          year: state.year,
          themeYear: state.themeYear,
          lastSeenUpdate: state.lastSeenUpdate,
          shouldShowNewChangesIndicator: state.shouldShowNewChangesIndicator,
          settings: state.settings,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          useCountriesStore.getState().setInitialCountriesForYear(state.year);
        }
      },
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<GeneralState>;

        const year = state.year ?? INITIAL_YEAR;
        const themeYear = state.themeYear ?? INITIAL_YEAR;

        return {
          ...currentState,
          ...state,
          year,
          themeYear,
          theme: getThemeForYear(themeYear),
        };
      },
    },
  ),
);

useCountriesStore.getState().setInitialCountriesForYear(INITIAL_YEAR);
