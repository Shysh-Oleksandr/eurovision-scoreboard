import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';
import { Year } from '../config';
import { ALL_THEMES, POINTS_ARRAY } from '../data/data';
import { getThemeForYear } from '../theme/themes';
import { getHostingCountryByYear } from '../theme/hosting';
import { Theme } from '../theme/types';

import { useCountriesStore } from './countriesStore';
import { BaseCountry } from '@/models';
import { useScoreboardStore } from './scoreboardStore';
import { getCustomBgImageFromDB } from '@/helpers/indexedDB';

export enum ShareImageAspectRatio {
  LANDSCAPE = '1200x630',
  SQUARE = '800x800',
  PORTRAIT = '750x1000',
}

export const INITIAL_YEAR = '2025' as Year;

export const DEFAULT_SETTINGS: Settings = {
  alwaysShowRankings: true,
  showQualificationModal: true,
  showWinnerModal: true,
  showWinnerConfetti: true,
  enableFullscreen: false,
  shouldShowBeforeUnloadWarning: true,
  shouldShowResetWarning: true,
  showRankChangeIndicator: true,
  shouldShowManualTelevoteWarning: true,
  showHostingCountryLogo: true,
  shouldShowHeartFlagIcon: false,
  shouldUseCustomBgImage: false,
  customBgImage: null,
  hostingCountryCode: 'CH', // Switzerland for 2025
  contestName: 'Eurovision',
  isJuniorContest: false,
  contestYear: INITIAL_YEAR,
  shouldLimitManualTelevotePoints: true,
  randomnessLevel: 50, // 0-100
  isPickQualifiersMode: false,
}

// Function to determine initial aspect ratio based on device width
export const getInitialAspectRatio = (): ShareImageAspectRatio => {
  if (typeof window !== 'undefined' && window.innerWidth < 576) {
    return ShareImageAspectRatio.SQUARE;
  }
  return ShareImageAspectRatio.LANDSCAPE;
};

export const DEFAULT_IMAGE_CUSTOMIZATION: ImageCustomizationSettings = {
  isCustomizationExpanded: false,
  title: '', // empty means use default (contestName + contestYear)
  subtitle: '', // empty means use default (stage name)
  layout: 2, // number of columns, default is 2
  maxCountries: 0, // 0 means show all
  showRankings: true,
  showPoints: true,
  shortCountryNames: false,
  aspectRatio: getInitialAspectRatio(),
  itemSize: 'lg' as 'sm' | 'md' | 'lg' | 'xl' | '2xl',
  titleFontSize: 36, // font size in px for title
  subtitleFontSize: 24, // font size in px for subtitle
  brandingFontSize: 20, // font size in px for branding text
  verticalPadding: 64, // vertical padding in px
  horizontalPadding: 80, // horizontal padding in px
  highQuality: true,
}

// Predefined aspect ratio presets for image customization
export const ASPECT_RATIO_PRESETS = {
  '1200x630': { width: 1200, height: 630, label: 'Landscape (16:9)' },
  '800x800': { width: 800, height: 800, label: 'Square (1:1)' },
  '750x1000': { width: 750, height: 1000, label: 'Portrait (3:4)' },
} as const;

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
  shouldShowHeartFlagIcon: boolean;
  showHostingCountryLogo: boolean;
  hostingCountryCode: string;  
  shouldUseCustomBgImage: boolean;
  customBgImage: string | null;
  contestName: string; // 'Eurovision' | 'Junior Eurovision'
  isJuniorContest: boolean;
  contestYear: string;
  shouldLimitManualTelevotePoints: boolean;
  randomnessLevel: number;
  isPickQualifiersMode: boolean;
}

export interface ImageCustomizationSettings {
  isCustomizationExpanded: boolean;
  title: string;
  subtitle: string;
  layout: number;
  maxCountries: number;
  showRankings: boolean;
  showPoints: boolean;
  shortCountryNames: boolean;
  aspectRatio: ShareImageAspectRatio;
  itemSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  titleFontSize: number; // font size in px for title
  subtitleFontSize: number; // font size in px for subtitle
  brandingFontSize: number; // font size in px for branding text
  verticalPadding: number; // vertical padding in px
  horizontalPadding: number; // horizontal padding in px
  highQuality: boolean;
}

export interface PointsItem {
  value: number;
  showDouzePoints: boolean;
  id: number;
}

export interface GeneralState {
  lastSeenUpdate: string | null;
  shouldShowNewChangesIndicator: boolean;
  year: Year;
  themeYear: string;
  theme: Theme;
  settings: Settings;
  imageCustomization: ImageCustomizationSettings;
  pointsSystem: PointsItem[]; // used during simulation
  settingsPointsSystem: PointsItem[]; // used locally in settings
  generalSettingsExpansion: {
    presets: boolean;
    contest: boolean;
    voting: boolean;
    uiPreferences: boolean;
  };
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
  setYear: (year: Year) => void;
  setTheme: (year: string, isJuniorTheme?: boolean) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setImageCustomization: (customization: Partial<ImageCustomizationSettings>) => void;
  setPointsSystem: (points: PointsItem[]) => void;
  setSettingsPointsSystem: (points: PointsItem[]) => void;
  setGeneralSettingsExpansion: (
    expansion: Partial<GeneralState['generalSettingsExpansion']>,
  ) => void;
  getHostingCountry: () => BaseCountry;
  resetAllSettings: () => void;

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
        generalSettingsExpansion: {
          presets: true,
          contest: true,
          voting: true,
          uiPreferences: true,
        },
        settings: DEFAULT_SETTINGS,
        imageCustomization: DEFAULT_IMAGE_CUSTOMIZATION,

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
          const isJunior = get().settings.isJuniorContest;

          set({
            year: year,
            settings: {
              ...get().settings,
              hostingCountryCode: getHostingCountryByYear(year, isJunior).code,
              contestYear: year,
            },
          });

          useCountriesStore.getState().updateCountriesForYear(year);
          useScoreboardStore.getState().setCurrentStageId(null);
        },
        setTheme: (year: string) => {
          // Remove all theme classes
          document.documentElement.classList.remove(
            ...ALL_THEMES.map((y) => `theme-${y}`),
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
        setImageCustomization: (customization: Partial<ImageCustomizationSettings>) => {
          set((state) => ({
            imageCustomization: { ...state.imageCustomization, ...customization },
          }));
        },
        setPointsSystem: (points: PointsItem[]) => {
          set({ pointsSystem: points });
        },
        setSettingsPointsSystem: (points: PointsItem[]) => {
          set({ settingsPointsSystem: points });
        },
        setGeneralSettingsExpansion: (expansion) => {
          set((state) => ({
            generalSettingsExpansion: {
              ...state.generalSettingsExpansion,
              ...expansion,
            },
          }));
        },
        getHostingCountry: () => {
          const countries = useCountriesStore.getState().getAllCountries();

          const hostingCountryCode = get().settings.hostingCountryCode || 'CH';

          return countries.find((country) => country.code === hostingCountryCode) as BaseCountry;
        },
        resetAllSettings: () => {
          set({ settings: DEFAULT_SETTINGS, pointsSystem: initialPointsSystem, settingsPointsSystem: initialPointsSystem });
        },
      }),
      {
        name: 'general-storage',
        partialize(state) {
          const { customBgImage: _ignore, ...restSettings } = state.settings;

          return {
            year: state.year,
            themeYear: state.themeYear,
            lastSeenUpdate: state.lastSeenUpdate,
            shouldShowNewChangesIndicator: state.shouldShowNewChangesIndicator,
            // Do not persist large image data URLs in localStorage to avoid quota issues
            settings: { ...restSettings, customBgImage: null },
            // Only persist aspectRatio and isCustomizationExpanded from imageCustomization
            imageCustomization: { aspectRatio: state.imageCustomization.aspectRatio, isCustomizationExpanded: state.imageCustomization.isCustomizationExpanded },
            settingsPointsSystem: state.settingsPointsSystem,
            generalSettingsExpansion: state.generalSettingsExpansion,
          };
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            const isJunior = state.settings?.isJuniorContest ?? false;
            useCountriesStore
              .getState()
              .setInitialCountriesForYear(state.year, {
                force: true,
                isJuniorContest: isJunior,
              });

            // Ensure theme is consistent; fallback to standard theme for the year
            const theme = getThemeForYear(state.themeYear ?? state.year);
            useGeneralStore.setState({ theme });

            // Load custom background image from IndexedDB after rehydration
            (async () => {
              const image = await getCustomBgImageFromDB();
              if (image) {
                const current = useGeneralStore.getState().settings;
                useGeneralStore.setState({
                  settings: { ...current, customBgImage: image },
                });
              }
            })();
          }
        },
        merge: (persistedState, currentState) => {
          const state = persistedState as Partial<GeneralState>;

          const year = state.year ?? INITIAL_YEAR;
          const themeYear = state.themeYear ?? INITIAL_YEAR;

          const settingsPointsSystem: PointsItem[] =
            state.settingsPointsSystem || initialPointsSystem;

          const persistedSettings = {
            ...currentState.settings,
            ...state.settings,
          };

          const isJunior = persistedSettings.isJuniorContest ?? false;
          const settings = {
            ...persistedSettings,
            isJuniorContest: isJunior,
          };

          // Merge imageCustomization, keeping only aspectRatio from persistence
          const imageCustomization = {
            ...currentState.imageCustomization,
            ...(state.imageCustomization && { aspectRatio: state.imageCustomization.aspectRatio, isCustomizationExpanded: state.imageCustomization.isCustomizationExpanded }),
          };

          return {
            ...currentState,
            ...state,
            year,
            themeYear,
            theme: getThemeForYear(themeYear),
            settingsPointsSystem,
            settings,
            imageCustomization,
          };
        },
      },
    ),
    { name: 'general-store' },
  ),
);

// Initialize once at app startup using current settings.
// We must pass the correct contest type to avoid defaulting to ESC.
(() => {
  const { settings, year } = useGeneralStore.getState();
  useCountriesStore.getState().setInitialCountriesForYear(year, {
    force: true,
    isJuniorContest: settings.isJuniorContest,
  });
})();

(async () => {
  const image = await getCustomBgImageFromDB();
  if (image) {
    const current = useGeneralStore.getState().settings;
    useGeneralStore.setState({
      settings: { ...current, customBgImage: image },
    });
  }
})();
