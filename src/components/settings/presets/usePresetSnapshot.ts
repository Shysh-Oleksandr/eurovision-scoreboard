import { Preset } from '@/helpers/indexedDB';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

const generateId = () =>
  `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const usePresetSnapshot = () => {
  const build = (name: string): Preset => {
    const generalState = useGeneralStore.getState();
    const countriesState = useCountriesStore.getState();

    const general = {
      year: generalState.year,
      themeYear: generalState.themeYear,
      settings: generalState.settings,
      settingsPointsSystem: generalState.settingsPointsSystem,
    };

    const countries = {
      eventAssignments: countriesState.eventAssignments,
      configuredEventStages: countriesState.configuredEventStages,
      countryOdds: countriesState.countryOdds,
      activeMode: countriesState.activeMode,
    };

    const now = Date.now();

    return {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      general,
      countries,
    };
  };

  return { build };
};
