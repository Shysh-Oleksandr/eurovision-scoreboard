import { getPresetFromDB } from '@/helpers/indexedDB';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const usePresetLoader = () => {
  const setConfiguredEventStages = useCountriesStore(
    (s) => s.setConfiguredEventStages,
  );
  const setEventAssignments = useCountriesStore((s) => s.setEventAssignments);
  const setBulkCountryOdds = useCountriesStore((s) => s.setBulkCountryOdds);
  const setTheme = useGeneralStore((s) => s.setTheme);
  const setYear = useGeneralStore((s) => s.setYear);
  const setSettings = useGeneralStore((s) => s.setSettings);
  const setSettingsPointsSystem = useGeneralStore(
    (s) => s.setSettingsPointsSystem,
  );
  const setEventStages = useScoreboardStore((s) => s.setEventStages);

  const loadPreset = async (id: string) => {
    try {
      const preset = await getPresetFromDB(id);

      if (!preset) {
        alert('Failed to load preset: not found');
        return;
      }

      const { general, countries } = preset;

      if (!general || !countries) {
        alert('Preset is corrupted or incomplete');
        return;
      }

      setEventStages([]);

      // Apply General store data
      if (general.themeYear) setTheme(general.themeYear);
      if (general.year) setYear(general.year);
      if (general.settings) setSettings(general.settings);
      if (general.settingsPointsSystem)
        setSettingsPointsSystem(general.settingsPointsSystem);

      // Apply Countries store data (ensure stages before assignments for proper sync)
      if (countries.configuredEventStages)
        setConfiguredEventStages(countries.configuredEventStages);
      requestIdleCallback(() => {
        if (countries.eventAssignments)
          setEventAssignments(countries.eventAssignments);
        if (countries.countryOdds) setBulkCountryOdds(countries.countryOdds);
      });

      alert('Preset loaded successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to load preset. See console for details.');
    }
  };

  return { loadPreset };
};
