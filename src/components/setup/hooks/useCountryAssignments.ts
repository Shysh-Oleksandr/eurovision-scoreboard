import { useEffect, useMemo } from 'react';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventStage,
} from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { buildEventStagesFromAssignments } from '../utils/buildEventStagesFromAssignments';

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

  // This is used to initialize the country assignments for the event
  useEffect(() => {
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
        const stageExists = configuredEventStages.some((s) => s.id.toUpperCase() === stageId);

        initialAssignments[country.code] = stageExists
          ? stageId
          : CountryAssignmentGroup.NOT_PARTICIPATING;
      } else if (countryData?.isQualified || countryData?.isAutoQualified) {
        // For qualified countries, assign to the last stage (typically Grand Final)
        const lastStage = configuredEventStages.sort(
          (a, b) => (b.order ?? 0) - (a.order ?? 0),
        )[0];
        initialAssignments[country.code] = lastStage
          ? lastStage.id
          : CountryAssignmentGroup.NOT_PARTICIPATING;
      } else {
        if (isGfOnly && countryData) {
          initialAssignments[country.code] =
            CountryAssignmentGroup.NOT_QUALIFIED;
        } else {
          initialAssignments[country.code] =
            CountryAssignmentGroup.NOT_PARTICIPATING;
        }
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

  const handleCountryAssignment = (countryCode: string, group: string) => {
    setEventAssignments({
      ...eventAssignments,
      [countryCode]: group,
    });
  };

  const handleBulkCountryAssignment = (
    countries: BaseCountry[],
    group: string,
  ) => {
    const countryCodes = countries.map((c) => c.code);

    const newAssignments = { ...eventAssignments };

    countryCodes.forEach((code) => {
      newAssignments[code] = group;
    });

    setEventAssignments(newAssignments);
  };

  const getCountryGroupAssignment = (country: BaseCountry) => {
    return (
      eventAssignments[country.code] || CountryAssignmentGroup.NOT_PARTICIPATING
    );
  };

  const countryGroups = useMemo(() => {
    const allCountries = getAllCountries();

    const {
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
    } = buildEventStagesFromAssignments(
      allCountries,
      configuredEventStages as EventStage[],
      eventAssignments,
    );

    return {
      eventStagesWithCountries,
      notParticipatingCountries,
      notQualifiedCountries,
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
    getCountryGroupAssignment,
    setAssignments: setEventAssignments,
    allAssignments: eventAssignments,
  };
};
