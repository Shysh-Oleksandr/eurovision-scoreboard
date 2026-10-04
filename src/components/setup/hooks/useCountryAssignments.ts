import { useCallback, useLayoutEffect, useMemo } from 'react';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
} from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';
import { buildEventStagesFromAssignments } from '../utils/buildEventStagesFromAssignments';

import { useGeneralStore } from '@/state/generalStore';

export const useCountryAssignments = () => {
  const isGfOnly = useGeneralStore((state) => state.isGfOnly);
  const customCountries = useCountriesStore((state) => state.customCountries);
  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );
  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const setEventAssignments = useCountriesStore(
    (state) => state.setEventAssignments,
  );

  const stageIds = configuredEventStages.map((s) => s.id).join(',');

  // This is used to initialize the country assignments for the event.
  // Layout effect for the same reason as useInitialLineup: the initial
  // assignment has to land before the first paint, otherwise every country
  // shows up under "not participating" for a frame and then jumps.
  useLayoutEffect(() => {
    if (Object.keys(eventAssignments).length > 0) return;

    // Initialize assignments even if there are no stages
    if (configuredEventStages.length === 0) return;

    const initialAssignments: Record<string, string> = {};
    const allCountries = getAllCountries();

    allCountries.forEach((country) => {
      const countryData = allCountriesForYear.find(
        (c) => c.code === country.code,
      );

      if (countryData?.semiFinalGroup && !isGfOnly) {
        const stageId = countryData.semiFinalGroup.toUpperCase();
        const stageExists = configuredEventStages.some(
          (s) => s.id.toUpperCase() === stageId,
        );

        initialAssignments[country.code] = stageExists
          ? stageId
          : CountryAssignmentGroup.NOT_PARTICIPATING;
      } else if (countryData?.isQualified || countryData?.isAutoQualified) {
        // For qualified countries, assign to the last stage (typically Grand Final)
        const [lastStage] = configuredEventStages.sort(
          (a, b) => (b.order ?? 0) - (a.order ?? 0),
        );

        initialAssignments[country.code] = lastStage
          ? lastStage.id
          : CountryAssignmentGroup.NOT_PARTICIPATING;
      } else if (isGfOnly && countryData) {
        initialAssignments[country.code] = CountryAssignmentGroup.NOT_QUALIFIED;
      } else {
        initialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    });

    setEventAssignments(initialAssignments);
  }, [
    allCountriesForYear,
    getAllCountries,
    customCountries,
    stageIds,
    configuredEventStages,
    eventAssignments,
    setEventAssignments,
    isGfOnly,
  ]);

  // Handlers read the store directly so they keep a stable identity (memoized
  // tiles depend on it) and never act on a stale assignments map.
  const handleBulkCountryAssignmentByCodes = useCallback(
    (countryCodes: string[], group: string) => {
      const { eventAssignments: current, setEventAssignments: set } =
        useCountriesStore.getState();

      if (countryCodes.every((code) => current[code] === group)) return;

      const newAssignments = { ...current };

      countryCodes.forEach((code) => {
        newAssignments[code] = group;
      });

      set(newAssignments);
    },
    [],
  );

  const handleCountryAssignment = useCallback(
    (countryCode: string, group: string) => {
      handleBulkCountryAssignmentByCodes([countryCode], group);
    },
    [handleBulkCountryAssignmentByCodes],
  );

  const handleBulkCountryAssignment = useCallback(
    (countries: BaseCountry[], group: string) => {
      handleBulkCountryAssignmentByCodes(
        countries.map((c) => c.code),
        group,
      );
    },
    [handleBulkCountryAssignmentByCodes],
  );

  const getCountryGroupAssignment = useCallback(
    (country: BaseCountry) =>
      useCountriesStore.getState().eventAssignments[country.code] ||
      CountryAssignmentGroup.NOT_PARTICIPATING,
    [],
  );

  const countryGroups = useMemo(() => {
    const allCountries = getAllCountries();

    const {
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
      toBeDrawnCountries,
    } = buildEventStagesFromAssignments(
      allCountries,
      configuredEventStages as EventStage[],
      eventAssignments,
    );

    return {
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
      toBeDrawnCountries,
      assignments: eventAssignments,
    };
  }, [
    eventAssignments,
    customCountries,
    getAllCountries,
    configuredEventStages,
  ]);

  return {
    countryGroups,
    handleCountryAssignment,
    handleBulkCountryAssignment,
    handleBulkCountryAssignmentByCodes,
    getCountryGroupAssignment,
    setAssignments: setEventAssignments,
    allAssignments: eventAssignments,
  };
};
