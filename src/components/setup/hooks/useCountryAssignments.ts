import { useEffect, useMemo } from 'react';

import {
  BaseCountry,
  Country,
  CountryAssignmentGroup,
  EventMode,
  EventStage,
  StageId,
} from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';

export const useCountryAssignments = (
  activeTab: EventMode,
  eventStages: EventStage[],
) => {
  const {
    allCountriesForYear,
    getAllCountries,
    customCountries,
    eventAssignments,
    setEventAssignments,
  } = useCountriesStore();

  const stageIds = eventStages.map((s) => s.id).join(',');

  useEffect(() => {
    if (
      Object.keys(eventAssignments[EventMode.SEMI_FINALS_AND_GRAND_FINAL])
        .length > 0
    ) {
      return;
    }

    const hasSemiFinals = eventStages.some((s) => s.id !== StageId.GF);

    if (eventStages.length === 0 || !hasSemiFinals) {
      return;
    }

    const semiFinalsInitialAssignments: Record<string, string> = {};
    const grandFinalOnlyInitialAssignments: Record<string, string> = {};
    const allCountries = getAllCountries();

    allCountries.forEach((country) => {
      const countryData = allCountriesForYear.find(
        (c) => c.code === country.code,
      );

      // SEMI_FINALS_AND_GRAND_FINAL initialization
      if (countryData?.isAutoQualified) {
        semiFinalsInitialAssignments[country.code] =
          CountryAssignmentGroup.AUTO_QUALIFIER;
      } else if (countryData?.semiFinalGroup) {
        const stageId = countryData.semiFinalGroup.toLowerCase();
        const stageExists = eventStages.some((s) => s.id === stageId);

        semiFinalsInitialAssignments[country.code] = stageExists
          ? stageId
          : CountryAssignmentGroup.NOT_PARTICIPATING;
      } else {
        semiFinalsInitialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }

      // GRAND_FINAL_ONLY initialization
      if (countryData) {
        if (countryData.isQualified) {
          grandFinalOnlyInitialAssignments[country.code] = StageId.GF;
        } else {
          grandFinalOnlyInitialAssignments[country.code] =
            CountryAssignmentGroup.NOT_QUALIFIED;
        }
      } else {
        grandFinalOnlyInitialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    });

    setEventAssignments({
      [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: semiFinalsInitialAssignments,
      [EventMode.GRAND_FINAL_ONLY]: grandFinalOnlyInitialAssignments,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allCountriesForYear,
    getAllCountries,
    customCountries,
    stageIds,
    eventStages,
    eventAssignments,
    setEventAssignments,
  ]);

  const handleCountryAssignment = (countryCode: string, group: string) => {
    setEventAssignments({
      ...eventAssignments,
      [activeTab]: {
        ...eventAssignments[activeTab],
        [countryCode]: group,
      },
    });
  };

  const handleBulkCountryAssignment = (
    countries: BaseCountry[],
    group: string,
  ) => {
    const countryCodes = countries.map((c) => c.code);

    const newAssignments = { ...eventAssignments[activeTab] };

    countryCodes.forEach((code) => {
      newAssignments[code] = group;
    });

    setEventAssignments({
      ...eventAssignments,
      [activeTab]: newAssignments,
    });
  };

  const getCountryGroupAssignment = (country: BaseCountry) => {
    return eventAssignments[activeTab]?.[country.code];
  };

  const countryGroups = useMemo(() => {
    const currentAssignments = eventAssignments[activeTab] || {};
    const allCountries = getAllCountries();

    const initialGroups: Record<string, Country[]> = {
      [CountryAssignmentGroup.AUTO_QUALIFIER]: [],
      [CountryAssignmentGroup.NOT_QUALIFIED]: [],
      [CountryAssignmentGroup.NOT_PARTICIPATING]: [],
    };

    if (activeTab === EventMode.GRAND_FINAL_ONLY) {
      initialGroups[StageId.GF] = [];
    }

    eventStages.forEach((stage) => {
      initialGroups[stage.id] = [];
    });

    allCountries.forEach((country) => {
      const group = currentAssignments[country.code];
      const countryWithPoints = {
        ...country,
        juryPoints: 0,
        televotePoints: 0,
        points: 0,
        lastReceivedPoints: null,
      };

      if (group && initialGroups[group]) {
        initialGroups[group].push(countryWithPoints);
      } else if (group) {
        // Country assigned to a group that doesn't exist (e.g. deleted stage)
        initialGroups[CountryAssignmentGroup.NOT_PARTICIPATING].push(
          countryWithPoints,
        );
      }
    });

    Object.values(initialGroups).forEach((group) => {
      group.sort((a, b) => a.name.localeCompare(b.name));
    });

    const populatedEventStages = eventStages.map((stage) => ({
      ...stage,
      countries: initialGroups[stage.id] || [],
    }));

    return {
      autoQualifiers: initialGroups[CountryAssignmentGroup.AUTO_QUALIFIER],
      grandFinalQualifiers: initialGroups[StageId.GF] || [],
      eventStagesWithCountries: populatedEventStages,
      notQualifiedCountries:
        initialGroups[CountryAssignmentGroup.NOT_QUALIFIED],
      notParticipatingCountries:
        initialGroups[CountryAssignmentGroup.NOT_PARTICIPATING],
      assignments: eventAssignments[activeTab],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eventAssignments,
    activeTab,
    customCountries,
    getAllCountries,
    eventStages,
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
