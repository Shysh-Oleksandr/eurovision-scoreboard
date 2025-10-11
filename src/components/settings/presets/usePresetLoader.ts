import { getPresetFromDB } from '@/helpers/indexedDB';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { toast } from 'react-toastify';

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
        toast('Failed to load preset: not found', {
          type: 'error',
        });
        return;
      }

      const { general, countries } = preset;

      if (!general || !countries) {
        toast('Preset is corrupted or incomplete', {
          type: 'error',
        });
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
      setTimeout(() => {
        if (countries.eventAssignments)
          setEventAssignments(countries.eventAssignments);
        if (countries.countryOdds) setBulkCountryOdds(countries.countryOdds);
      }, 100);

      toast('Preset loaded successfully.', {
        type: 'success',
      });
    } catch (e) {
      console.error(e);
      toast('Failed to load preset. See console for details.', {
        type: 'error',
      });
    }
  };

  return { loadPreset };
};
