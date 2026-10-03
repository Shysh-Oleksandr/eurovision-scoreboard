import { useDeferredValue, useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { computeCurrentSetupFingerprint } from '@/helpers/contestFingerprint';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

/**
 * Whether the current setup diverges from the loaded contest's saved state.
 * Only meaningful while a saved contest is active; local (never saved)
 * contests are never "dirty". The fingerprint is recomputed lazily from the
 * stores whenever one of its inputs changes.
 */
export const useContestDirtyState = (): boolean => {
  const activeContestId = useGeneralStore(
    (state) => state.activeContest?._id ?? null,
  );
  const loaded = useGeneralStore((state) => state.loadedContestFingerprint);

  const inputs = useGeneralStore(
    useShallow((state) => ({
      contestName: state.settings.contestName,
      contestDescription: state.settings.contestDescription,
      contestYear: state.settings.contestYear,
      hostingCountryCode: state.settings.hostingCountryCode,
      contestType: state.settings.contestType,
      splitPointsSystem: state.settings.splitPointsSystem,
      allowMultiplePointsToSameEntry:
        state.settings.allowMultiplePointsToSameEntry,
      randomnessLevel: state.settings.randomnessLevel,
      pointsSpread: state.settings.pointsSpread,
      settingsPointsSystem: state.settingsPointsSystem,
      settingsTelevotePointsSystem: state.settingsTelevotePointsSystem,
      pointsSystem: state.pointsSystem,
      televotePointsSystem: state.televotePointsSystem,
      year: state.year,
    })),
  );
  const countriesInputs = useCountriesStore(
    useShallow((state) => ({
      configuredEventStages: state.configuredEventStages,
      eventAssignments: state.eventAssignments,
      countryOdds: state.countryOdds,
      customCountries: state.customCountries,
    })),
  );

  const deferredInputs = useDeferredValue(inputs);
  const deferredCountriesInputs = useDeferredValue(countriesInputs);

  return useMemo(() => {
    if (!activeContestId || !loaded) return false;

    return computeCurrentSetupFingerprint() !== loaded;
    // The deferred snapshots are the recompute triggers; the values are read
    // from the stores inside computeCurrentSetupFingerprint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContestId, loaded, deferredInputs, deferredCountriesInputs]);
};
