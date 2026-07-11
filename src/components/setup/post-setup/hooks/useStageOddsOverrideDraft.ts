import { useCallback, useEffect, useState } from 'react';

import { OddsController } from '@/components/settings/useGlobalOddsController';
import { EventStage, StageOddsOverride } from '@/models';
import {
  CountryOdds,
  resolveYearOddsFor,
  useCountriesStore,
} from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

const DEFAULT_ODD = 50;

const oddsForStageDiffer = (
  stage: EventStage,
  local: CountryOdds,
  global: CountryOdds,
): boolean =>
  stage.countries.some((country) => {
    const l = local[country.code] || {};
    const g = global[country.code] || {};

    return (
      (l.juryOdds ?? DEFAULT_ODD) !== (g.juryOdds ?? DEFAULT_ODD) ||
      (l.televoteOdds ?? DEFAULT_ODD) !== (g.televoteOdds ?? DEFAULT_ODD)
    );
  });

interface UseStageOddsOverrideDraftResult {
  controller: OddsController;
  isOverridden: boolean;
  resetToGlobal: () => void;
  getOddsOverride: () => StageOddsOverride | undefined;
}

/**
 * Local draft for the per-stage odds override (mirrors
 * `useStagePointsOverrideDraft`). Seeds from `stage.overrides?.odds` when present,
 * else from the global odds / randomness / points-spread. `getOddsOverride()`
 * returns `undefined` when the draft matches the globals, so no override is stored.
 */
export const useStageOddsOverrideDraft = (
  stage: EventStage,
  isOpen: boolean,
): UseStageOddsOverrideDraftResult => {
  const globalCountryOdds = useCountriesStore((state) => state.countryOdds);
  const globalRandomnessLevel = useGeneralStore(
    (state) => state.settings.randomnessLevel,
  );
  const globalPointsSpread = useGeneralStore(
    (state) => state.settings.pointsSpread,
  );

  const getGlobalDefaults = useCallback(() => {
    const existing = stage.overrides?.odds;

    if (existing) {
      return {
        countryOdds: { ...globalCountryOdds, ...existing.countryOdds },
        randomnessLevel: existing.randomnessLevel,
        pointsSpread: existing.pointsSpread,
      };
    }

    return {
      countryOdds: { ...globalCountryOdds },
      randomnessLevel: globalRandomnessLevel,
      pointsSpread: globalPointsSpread,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const [localCountryOdds, setLocalCountryOdds] = useState<CountryOdds>(
    () => getGlobalDefaults().countryOdds,
  );
  const [localRandomness, setLocalRandomness] = useState<number>(
    () => getGlobalDefaults().randomnessLevel,
  );
  const [localPointsSpread, setLocalPointsSpread] = useState<number>(
    () => getGlobalDefaults().pointsSpread,
  );

  useEffect(() => {
    if (!isOpen) return;
    const defaults = getGlobalDefaults();

    setLocalCountryOdds(defaults.countryOdds);
    setLocalRandomness(defaults.randomnessLevel);
    setLocalPointsSpread(defaults.pointsSpread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetToGlobal = useCallback(() => {
    setLocalCountryOdds({ ...globalCountryOdds });
    setLocalRandomness(globalRandomnessLevel);
    setLocalPointsSpread(globalPointsSpread);
  }, [globalCountryOdds, globalRandomnessLevel, globalPointsSpread]);

  const differsFromGlobal =
    oddsForStageDiffer(stage, localCountryOdds, globalCountryOdds) ||
    localRandomness !== globalRandomnessLevel ||
    localPointsSpread !== globalPointsSpread;

  const getOddsOverride = useCallback((): StageOddsOverride | undefined => {
    const differs =
      oddsForStageDiffer(stage, localCountryOdds, globalCountryOdds) ||
      localRandomness !== globalRandomnessLevel ||
      localPointsSpread !== globalPointsSpread;

    if (!differs) return undefined;

    // Store odds only for this stage's countries (all-or-nothing snapshot).
    const countryOdds: CountryOdds = {};

    stage.countries.forEach((country) => {
      const odds = localCountryOdds[country.code] || {};

      countryOdds[country.code] = {
        juryOdds: odds.juryOdds ?? DEFAULT_ODD,
        televoteOdds: odds.televoteOdds ?? DEFAULT_ODD,
      };
    });

    return {
      countryOdds,
      randomnessLevel: localRandomness,
      pointsSpread: localPointsSpread,
    };
  }, [
    stage,
    localCountryOdds,
    localRandomness,
    localPointsSpread,
    globalCountryOdds,
    globalRandomnessLevel,
    globalPointsSpread,
  ]);

  const controller: OddsController = {
    countryOdds: localCountryOdds,
    randomnessLevel: localRandomness,
    pointsSpread: localPointsSpread,
    updateCountryOdds: (countryCode, odds) =>
      setLocalCountryOdds((prev) => ({
        ...prev,
        [countryCode]: { ...prev[countryCode], ...odds },
      })),
    setBulkCountryOdds: (odds, replace = false) =>
      setLocalCountryOdds((prev) =>
        replace ? { ...odds } : { ...prev, ...odds },
      ),
    setRandomnessLevel: setLocalRandomness,
    setPointsSpread: setLocalPointsSpread,
    loadYearOdds: (countries) =>
      setLocalCountryOdds((prev) => ({
        ...prev,
        ...resolveYearOddsFor(
          countries,
          useCountriesStore.getState().allCountriesForYear,
        ),
      })),
  };

  return {
    controller,
    isOverridden: differsFromGlobal,
    resetToGlobal,
    getOddsOverride,
  };
};
