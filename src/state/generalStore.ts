import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';
import { Year } from '../config';
import { SUPPORTED_YEARS } from '../data/data';
import { getThemeForYear } from '../theme/themes';
import { themesInfo } from '../theme/themesInfo';
import { Theme, ThemeInfo } from '../theme/types';

import { useCountriesStore } from './countriesStore';

export const INITIAL_YEAR = '2025' as Year;

interface GeneralState {
  lastSeenUpdate: string | null;
  shouldShowNewChangesIndicator: boolean;
  year: Year;
  themeYear: Year;
  theme: Theme;
  themeInfo: ThemeInfo;
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
  setYear: (year: Year) => void;
  setTheme: (year: Year) => void;
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
      themeInfo: themesInfo[INITIAL_YEAR],
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
          themeInfo: themesInfo[year],
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
    }),
    {
      name: 'general-storage',
    },
  ),
);
