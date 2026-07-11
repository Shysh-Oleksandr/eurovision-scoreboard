import { BaseCountry } from '@/models';
import { CountryOdds, useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

/**
 * Abstraction that lets the same `OddsSettings` UI be driven either by the global
 * stores (settings modal) or by a per-stage override draft. Mirrors the
 * `PointsSystemController` pattern used for the per-stage points-system override.
 */
export interface OddsController {
  countryOdds: CountryOdds;
  randomnessLevel: number;
  pointsSpread: number;
  updateCountryOdds: (
    countryCode: string,
    odds: { juryOdds?: number; televoteOdds?: number },
  ) => void;
  setBulkCountryOdds: (odds: CountryOdds, replace?: boolean) => void;
  setRandomnessLevel: (value: number) => void;
  setPointsSpread: (value: number) => void;
  loadYearOdds: (countries: BaseCountry[]) => void;
}

/**
 * Binds an `OddsController` to the global stores, preserving the existing
 * settings-panel behavior. Used by `SettingsModal`.
 */
export const useGlobalOddsController = (): OddsController => {
  const countryOdds = useCountriesStore((state) => state.countryOdds);
  const updateCountryOdds = useCountriesStore(
    (state) => state.updateCountryOdds,
  );
  const setBulkCountryOdds = useCountriesStore(
    (state) => state.setBulkCountryOdds,
  );
  const loadYearOdds = useCountriesStore((state) => state.loadYearOdds);

  const randomnessLevel = useGeneralStore(
    (state) => state.settings.randomnessLevel,
  );
  const pointsSpread = useGeneralStore((state) => state.settings.pointsSpread);
  const setSettings = useGeneralStore((state) => state.setSettings);

  return {
    countryOdds,
    randomnessLevel,
    pointsSpread,
    updateCountryOdds,
    setBulkCountryOdds,
    setRandomnessLevel: (value) => setSettings({ randomnessLevel: value }),
    setPointsSpread: (value) => setSettings({ pointsSpread: value }),
    loadYearOdds,
  };
};
