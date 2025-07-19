import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';
import { Year } from '../config';
import { SUPPORTED_YEARS } from '../data/data';
import { getThemeForYear } from '../theme/themes';
import { Theme } from '../theme/types';

import { useCountriesStore } from './countriesStore';

export const INITIAL_YEAR = '2025' as Year;

interface GeneralState {
  lastSeenUpdate: string | null;
  shouldShowNewChangesIndicator: boolean;
  year: Year;
  themeYear: Year;
  theme: Theme;
  alwaysShowRankings: boolean;
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
  setYear: (year: Year) => void;
  setTheme: (year: Year) => void;
  setAlwaysShowRankings: (show: boolean) => void;
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
      alwaysShowRankings: true,
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
      setAlwaysShowRankings: (show: boolean) => {
        set({ alwaysShowRankings: show });
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
          alwaysShowRankings: state.alwaysShowRankings,
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
