import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';
import { Year } from '../config';
import { POINTS_ARRAY, SUPPORTED_YEARS } from '../data/data';
import { getThemeForYear } from '../theme/themes';
import { Theme } from '../theme/types';

import { useCountriesStore } from './countriesStore';

export const INITIAL_YEAR = '2025' as Year;

interface Settings {
  alwaysShowRankings: boolean;
  showQualificationModal: boolean;
  showWinnerModal: boolean;
  showWinnerConfetti: boolean;
  enableFullscreen: boolean;
  shouldShowBeforeUnloadWarning: boolean;
  shouldShowResetWarning: boolean;
  showRankChangeIndicator: boolean;
  shouldShowManualTelevoteWarning: boolean;
}

export interface PointsItem {
  value: number;
  showDouzePoints: boolean;
  id: number;
}

interface GeneralState {
  lastSeenUpdate: string | null;
  shouldShowNewChangesIndicator: boolean;
  year: Year;
  themeYear: Year;
  theme: Theme;
  settings: Settings;
  pointsSystem: PointsItem[]; // used during simulation
  settingsPointsSystem: PointsItem[]; // used locally in settings
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
  setYear: (year: Year) => void;
  setTheme: (year: Year) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setPointsSystem: (points: PointsItem[]) => void;
  setSettingsPointsSystem: (points: PointsItem[]) => void;
}

const getLatestUpdate = () => {
  const [latest] = WHATS_NEW;

  if (latest) {
    return `${latest.date}-${latest.title}`;
  }

  return null;
};

const initialPointsSystem = POINTS_ARRAY.map((value, index) => ({
  value,
  showDouzePoints: value === 12,
  id: index,
}));

export const useGeneralStore = create<GeneralState>()(
  devtools(
    persist(
      (set, get) => ({
        lastSeenUpdate: null,
        shouldShowNewChangesIndicator: false,
        year: INITIAL_YEAR,
        themeYear: INITIAL_YEAR,
        theme: getThemeForYear(INITIAL_YEAR),
        pointsSystem: initialPointsSystem,
        settingsPointsSystem: initialPointsSystem,
        settings: {
          alwaysShowRankings: true,
          showQualificationModal: true,
          showWinnerModal: true,
          showWinnerConfetti: true,
          enableFullscreen: false,
          shouldShowBeforeUnloadWarning: true,
          shouldShowResetWarning: true,
          showRankChangeIndicator: true,
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
        setPointsSystem: (points: PointsItem[]) => {
          set({ pointsSystem: points });
        },
        setSettingsPointsSystem: (points: PointsItem[]) => {
          set({ settingsPointsSystem: points });
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
            settingsPointsSystem: state.settingsPointsSystem,
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

          // Convert old points system format to new format if needed
          let settingsPointsSystem: PointsItem[] =
            state.pointsSystem || initialPointsSystem; // keep old points system for backwards compatibility

          if (state.settingsPointsSystem) {
            if (
              Array.isArray(state.settingsPointsSystem) &&
              typeof state.settingsPointsSystem[0] === 'number'
            ) {
              settingsPointsSystem = (
                state.settingsPointsSystem as unknown as number[]
              ).map((value, index) => ({
                value,
                showDouzePoints: value === 12,
                id: index,
              }));
            } else {
              settingsPointsSystem = state.settingsPointsSystem as PointsItem[];
            }
          }

          return {
            ...currentState,
            ...state,
            year,
            themeYear,
            theme: getThemeForYear(themeYear),
            settingsPointsSystem,
          };
        },
      },
    ),
    { name: 'general-store' },
  ),
);

useCountriesStore.getState().setInitialCountriesForYear(INITIAL_YEAR);
