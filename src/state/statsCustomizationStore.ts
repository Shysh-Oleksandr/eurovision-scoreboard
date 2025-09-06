import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StatsCustomizationSettings {
  title: string;
  showBackgroundImage: boolean;
  backgroundOpacity: number;
  borderOpacity: number;
  generateOnOpen: boolean;
  isCustomizationExpanded: boolean;
  showVotingCountriesNames: boolean;
}

export interface StatsCustomizationState {
  settings: StatsCustomizationSettings;
  setSettings: (settings: Partial<StatsCustomizationSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_STATS_CUSTOMIZATION: StatsCustomizationSettings = {
  title: '',
  showBackgroundImage: true,
  backgroundOpacity: 0.3,
  borderOpacity: 1,
  generateOnOpen: true,
  isCustomizationExpanded: false,
  showVotingCountriesNames: false,
};

export const useStatsCustomizationStore = create<StatsCustomizationState>()(
  persist(
    (set) => ({
      settings: DEFAULT_STATS_CUSTOMIZATION,

      setSettings: (newSettings: Partial<StatsCustomizationSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetSettings: () => {
        set({ settings: DEFAULT_STATS_CUSTOMIZATION });
      },
    }),
    {
      name: 'stats-customization-store',
      partialize(state) {
        const { title, ...restSettings } = state.settings;

        return {
          settings: restSettings,
        };
      },
    },
  ),
);
