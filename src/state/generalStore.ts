import { create } from 'zustand';

import { devtools, persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';
import { Year } from '../config';
import {
  ALL_THEMES,
  DEFAULT_HOSTING_COUNTRY_CODE,
  DEFAULT_HOSTING_COUNTRY_NAME,
  POINTS_ARRAY,
} from '../data/data';
import { getThemeForYear } from '../theme/themes';
import { api } from '@/api/client';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryByYear } from '../theme/hosting';
import { Theme } from '../theme/types';

import { useCountriesStore } from './countriesStore';
import { useScoreboardStore } from './scoreboardStore';
import { getCustomBgImageFromDB } from '@/helpers/indexedDB';
import { CustomTheme, ThemeCreator } from '@/types/customTheme';
import { Contest } from '@/types/contest';
import { BaseCountry } from '@/models';
import {
  applyCustomTheme as applyCustomThemeUtil,
  clearCustomTheme as clearCustomThemeUtil,
} from '@/theme/themeUtils';

export enum ScoreboardMobileLayout {
  ONE_COLUMN = 'one-column',
  TWO_COLUMN = 'two-column',
}

export enum ShareImageAspectRatio {
  LANDSCAPE = '1200x630',
  SQUARE = '800x800',
  PORTRAIT = '750x1000',
}

export enum PresentationPointsGrouping {
  INDIVIDUAL = 'individual',
  GROUPED = 'grouped',
}

export const INITIAL_YEAR = '2025' as Year;

const DEFAULT_SETTINGS: Settings = {
  alwaysShowRankings: true,
  showQualificationModal: true,
  showWinnerModal: true,
  showWinnerConfetti: true,
  enableFullscreen: false,
  showRankChangeIndicator: true,
  showHostingCountryLogo: true,
  shouldShowHeartFlagIcon: true,
  shouldUseCustomBgImage: false,
  customBgImage: null,
  hostingCountryCode: DEFAULT_HOSTING_COUNTRY_CODE,
  contestName: 'Eurovision',
  contestDescription: '',
  isJuniorContest: false,
  contestYear: INITIAL_YEAR,
  shouldLimitManualTelevotePoints: true,
  shouldShowJuryVotingProgress: true,
  randomnessLevel: 50, // 0-100
  isPickQualifiersMode: false,
  revealTelevoteLowestToHighest: false,
  presentationModeEnabled: true,
  useGroupedJuryPoints: false,
  autoStartPresentation: false,
  enablePredefinedVotes: false,
  enableWinterEffects: false,
  snowFallIntensity: 5, // 1-10
  blurModalBackground: false,
};

const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  isPresenting: false,
  presentationSpeedSeconds: 5,
  presentationJuryGrouping: PresentationPointsGrouping.INDIVIDUAL,
  pauseAfterAnimatedPoints: true,
  scoreboardMobileLayout: ScoreboardMobileLayout.ONE_COLUMN,
};

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
};

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
  showRankChangeIndicator: boolean;
  shouldShowHeartFlagIcon: boolean;
  showHostingCountryLogo: boolean;
  hostingCountryCode: string;
  shouldUseCustomBgImage: boolean;
  customBgImage: string | null;
  contestName: string; // 'Eurovision' | 'Junior Eurovision'
  contestDescription: string;
  isJuniorContest: boolean;
  contestYear: string;
  shouldLimitManualTelevotePoints: boolean;
  shouldShowJuryVotingProgress: boolean;
  randomnessLevel: number;
  isPickQualifiersMode: boolean;
  revealTelevoteLowestToHighest: boolean;
  presentationModeEnabled: boolean;
  useGroupedJuryPoints: boolean;
  autoStartPresentation: boolean;
  enablePredefinedVotes: boolean;
  enableWinterEffects: boolean;
  snowFallIntensity: number;
  blurModalBackground: boolean;
}

interface PresentationSettings {
  isPresenting: boolean;
  presentationSpeedSeconds: number; // delay between actions in seconds
  presentationJuryGrouping: PresentationPointsGrouping;
  pauseAfterAnimatedPoints: boolean;
  scoreboardMobileLayout: ScoreboardMobileLayout;
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
  isGfOnly: boolean;
  themeYear: string;
  theme: Theme;
  customTheme: CustomTheme | null;
  settings: Settings;
  presentationSettings: PresentationSettings;
  imageCustomization: ImageCustomizationSettings;
  pointsSystem: PointsItem[]; // used during simulation
  settingsPointsSystem: PointsItem[]; // used locally in settings
  generalSettingsExpansion: {
    contest: boolean;
    voting: boolean;
    uiPreferences: boolean;
    confirmations: boolean;
  };
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
  setYear: (year: Year) => void;
  setIsGfOnly: (isGfOnly: boolean) => void;
  setTheme: (year: string, isJuniorTheme?: boolean) => void;
  applyCustomTheme: (theme: CustomTheme) => void;
  clearCustomTheme: () => void;
  setSettings: (settings: Partial<Settings>) => void;
  setImageCustomization: (
    customization: Partial<ImageCustomizationSettings>,
  ) => void;
  setPointsSystem: (points: PointsItem[]) => void;
  setSettingsPointsSystem: (points: PointsItem[]) => void;
  setGeneralSettingsExpansion: (
    expansion: Partial<GeneralState['generalSettingsExpansion']>,
  ) => void;
  getHostingCountry: () => BaseCountry;
  resetAllSettings: () => void;
  setPresentationSettings: (settings: Partial<PresentationSettings>) => void;
  // Transient flag to suppress applying profile active theme once
  suppressActiveThemeOnce: boolean;
  setSuppressActiveThemeOnce: (value: boolean) => void;
  // Block re-applying this remote active theme id (previous custom) after local switch
  blockedActiveThemeId: string | null;
  setBlockedActiveThemeId: (id: string | null) => void;
  // When true, ignore applying profile active theme while on static themes
  suppressProfileActiveOnStatic: boolean;
  // Active contest tracking (similar to active theme)
  activeContest: Contest | null;
  importedCustomEntries: BaseCountry[]; // Imported from active contest
  setActiveContest: (contest: Contest | null) => void;
  setImportedCustomEntries: (entries: BaseCountry[]) => void;
  suppressActiveContestOnce: boolean;
  setSuppressActiveContestOnce: (value: boolean) => void;
  blockedActiveContestId: string | null;
  setBlockedActiveContestId: (id: string | null) => void;
  contestToLoad: { contest: Contest; snapshot: any } | null;
  setContestToLoad: (data: { contest: Contest; snapshot: any } | null) => void;
  isContestsModalOpen: boolean;
  setIsContestsModalOpen: (open: boolean) => void;
  selectedProfileUser: ThemeCreator | null;
  setSelectedProfileUser: (user: ThemeCreator | null) => void;
  isThemesModalOpen: boolean;
  setIsThemesModalOpen: (open: boolean) => void;
  themeToEdit: CustomTheme | null;
  setThemeToEdit: (theme: CustomTheme | null) => void;
  themeToDuplicate: CustomTheme | null;
  setThemeToDuplicate: (theme: CustomTheme | null) => void;
  contestToEdit: Contest | null;
  setContestToEdit: (contest: Contest | null) => void;
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
        isGfOnly: false,
        themeYear: INITIAL_YEAR,
        theme: getThemeForYear(INITIAL_YEAR),
        customTheme: null,
        activeContest: null,
        importedCustomEntries: [],
        pointsSystem: initialPointsSystem,
        settingsPointsSystem: initialPointsSystem,
        generalSettingsExpansion: {
          contest: true,
          voting: true,
          uiPreferences: true,
          confirmations: true,
        },
        settings: DEFAULT_SETTINGS,
        presentationSettings: DEFAULT_PRESENTATION_SETTINGS,
        imageCustomization: DEFAULT_IMAGE_CUSTOMIZATION,
        suppressActiveThemeOnce: false,
        blockedActiveThemeId: null,
        suppressProfileActiveOnStatic: false,
        suppressActiveContestOnce: false,
        blockedActiveContestId: null,
        contestToLoad: null,
        isContestsModalOpen: false,
        selectedProfileUser: null,
        isThemesModalOpen: false,
        themeToEdit: null,
        themeToDuplicate: null,
        contestToEdit: null,
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
              contestDescription: '',
            },
            activeContest: null,
            importedCustomEntries: [],
          });

          useCountriesStore.getState().updateCountriesForYear(year);
          useScoreboardStore.getState().leaveEvent();
        },
        setIsGfOnly: (isGfOnly: boolean) => {
          set({ isGfOnly });
        },
        setTheme: (year: string) => {
          // Clear any custom theme first
          clearCustomThemeUtil();

          // Remove all theme classes
          // document.documentElement.classList.remove(
          //   ...ALL_THEMES.map((y) => `theme-${y}`),
          // );
          // // Add the new theme class
          // document.documentElement.classList.add(`theme-${year}`);

          // Set data-theme immediately to avoid flash; useThemeSetup will also enforce
          document.documentElement.setAttribute('data-theme', year);

          const prevCustom = get().customTheme;
          set({
            themeYear: year,
            theme: getThemeForYear(year),
            customTheme: null,
            suppressActiveThemeOnce: true,
            blockedActiveThemeId: prevCustom?._id ?? get().blockedActiveThemeId,
            suppressProfileActiveOnStatic: true,
          });

          // Proactively clear active theme on the server to avoid reapplication
          (async () => {
            try {
              const auth = useAuthStore.getState();
              if (auth.user) {
                await api.post('/themes/clear-active');
                useAuthStore.setState({
                  user: { ...auth.user, activeThemeId: undefined },
                });
              }
            } catch (_) {
              // noop; guard via suppression below handles races
            }
          })();
        },
        applyCustomTheme: (theme: CustomTheme) => {
          // Remove all predefined theme classes
          document.documentElement.classList.remove(
            ...ALL_THEMES.map((y) => `theme-${y}`),
          );

          // Apply custom theme
          applyCustomThemeUtil(theme);

          const prevCustom = get().customTheme;
          set({
            customTheme: theme,
            blockedActiveThemeId: prevCustom?._id ?? get().blockedActiveThemeId,
            suppressProfileActiveOnStatic: false,
          });
        },
        clearCustomTheme: () => {
          clearCustomThemeUtil();

          // Reapply the current static theme
          const { themeYear } = get();
          document.documentElement.classList.add(`theme-${themeYear}`);

          set({ customTheme: null });
        },
        setSuppressActiveThemeOnce: (value: boolean) => {
          set({ suppressActiveThemeOnce: value });
        },
        setBlockedActiveThemeId: (id: string | null) => {
          set({ blockedActiveThemeId: id });
        },
        setActiveContest: (contest: Contest | null) => {
          set({ activeContest: contest });
        },
        setSuppressActiveContestOnce: (value: boolean) => {
          set({ suppressActiveContestOnce: value });
        },
        setBlockedActiveContestId: (id: string | null) => {
          set({ blockedActiveContestId: id });
        },
        setContestToLoad: (data: { contest: Contest; snapshot: any } | null) => {
          set({ contestToLoad: data });
        },
        setIsContestsModalOpen: (open: boolean) => {
          set({ isContestsModalOpen: open });
        },
        setSelectedProfileUser: (user: ThemeCreator | null) => {
          set({ selectedProfileUser: user });
        },
        setIsThemesModalOpen: (open: boolean) => {
          set({ isThemesModalOpen: open });
        },
        setThemeToEdit: (theme: CustomTheme | null) => {
          set({ themeToEdit: theme });
        },
        setThemeToDuplicate: (theme: CustomTheme | null) => {
          set({ themeToDuplicate: theme });
        },
        setContestToEdit: (contest: Contest | null) => {
          set({ contestToEdit: contest });
        },
        setImportedCustomEntries: (entries: BaseCountry[]) => {
          set({ importedCustomEntries: entries });
        },
        setSettings: (settings: Partial<Settings>) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
          }));
        },
        setImageCustomization: (
          customization: Partial<ImageCustomizationSettings>,
        ) => {
          set((state) => ({
            imageCustomization: {
              ...state.imageCustomization,
              ...customization,
            },
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

          if (countries.length === 0) {
            // Return a default country structure if countries list is empty
            return {
              name: DEFAULT_HOSTING_COUNTRY_NAME,
              code: DEFAULT_HOSTING_COUNTRY_CODE,
            } as BaseCountry;
          }

          const hostingCountryCode =
            get().settings.hostingCountryCode || DEFAULT_HOSTING_COUNTRY_CODE;

          const found = countries.find(
            (country) => country.code === hostingCountryCode,
          );

          if (found) {
            return found;
          }

          return (
            countries.find(
              (country) => country.code === DEFAULT_HOSTING_COUNTRY_CODE,
            ) || countries[0]
          );
        },
        resetAllSettings: () => {
          get().setYear(INITIAL_YEAR);

          set({
            themeYear: INITIAL_YEAR,
            theme: getThemeForYear(INITIAL_YEAR),
            settings: DEFAULT_SETTINGS,
            pointsSystem: initialPointsSystem,
            settingsPointsSystem: initialPointsSystem,
            presentationSettings: DEFAULT_PRESENTATION_SETTINGS,
            imageCustomization: DEFAULT_IMAGE_CUSTOMIZATION,
          });

          localStorage.clear();
        },
        setPresentationSettings: (settings: Partial<PresentationSettings>) => {
          set((state) => ({
            presentationSettings: {
              ...state.presentationSettings,
              ...settings,
            },
          }));
        },
      }),
      {
        name: 'general-storage',
        partialize(state) {
          const { customBgImage: _ignore, ...restSettings } = state.settings;
          const {
            isPresenting: _ignorePresenting,
            ...restPresentationSettings
          } = state.presentationSettings;

          return {
            year: state.year,
            isGfOnly: state.isGfOnly,
            theme: state.theme,
            themeYear: state.themeYear,
            customTheme: state.customTheme,
            activeContest: state.activeContest,
            importedCustomEntries: state.importedCustomEntries,
            lastSeenUpdate: state.lastSeenUpdate,
            shouldShowNewChangesIndicator: state.shouldShowNewChangesIndicator,
            // Do not persist large image data URLs in localStorage to avoid quota issues
            settings: { ...restSettings, customBgImage: null },
            // Only persist aspectRatio and isCustomizationExpanded from imageCustomization
            imageCustomization: {
              aspectRatio: state.imageCustomization.aspectRatio,
              isCustomizationExpanded:
                state.imageCustomization.isCustomizationExpanded,
            },
            settingsPointsSystem: state.settingsPointsSystem,
            generalSettingsExpansion: state.generalSettingsExpansion,
            presentationSettings: restPresentationSettings,
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

            (async () => {
              const currentSettings = useGeneralStore.getState().settings;
              if (!currentSettings.shouldUseCustomBgImage) return;

              requestAnimationFrame(async () => {
                const image = await getCustomBgImageFromDB();
                if (image) {
                  useGeneralStore.setState({
                    settings: { ...currentSettings, customBgImage: image },
                  });
                }
              });
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
            ...(state.imageCustomization && {
              aspectRatio: state.imageCustomization.aspectRatio,
              isCustomizationExpanded:
                state.imageCustomization.isCustomizationExpanded,
            }),
          };

          return {
            ...currentState,
            ...state,
            year,
            themeYear,
            customTheme: state.customTheme ?? null,
            theme: getThemeForYear(themeYear),
            settingsPointsSystem,
            settings,
            imageCustomization,
          };
        },
      },
    ),
    { name: 'general-store', enabled: process.env.NODE_ENV === 'development' },
  ),
);

(async () => {
  const currentSettings = useGeneralStore.getState().settings;
  if (!currentSettings.shouldUseCustomBgImage) return;

  requestAnimationFrame(async () => {
    const image = await getCustomBgImageFromDB();
    if (image) {
      useGeneralStore.setState({
        settings: { ...currentSettings, customBgImage: image },
      });
    }
  });
})();
