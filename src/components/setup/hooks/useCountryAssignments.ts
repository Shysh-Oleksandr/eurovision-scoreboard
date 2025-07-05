import { useEffect, useMemo, useState } from 'react';

import {
  BaseCountry,
  CountryAssignmentGroup,
  EventMode,
} from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';

export const useCountryAssignments = (activeTab: EventMode) => {
  const { allCountriesForYear, getAllCountries, customCountries } =
    useCountriesStore();

  const [assignments, setAssignments] = useState<
    Record<EventMode, Record<string, CountryAssignmentGroup>>
  >({
    [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: {},
    [EventMode.GRAND_FINAL_ONLY]: {},
  });

  useEffect(() => {
    const semiFinalsInitialAssignments: Record<string, CountryAssignmentGroup> =
      {};
    const grandFinalOnlyInitialAssignments: Record<
      string,
      CountryAssignmentGroup
    > = {};
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
        semiFinalsInitialAssignments[country.code] =
          countryData.semiFinalGroup as CountryAssignmentGroup;
      } else {
        semiFinalsInitialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }

      // GRAND_FINAL_ONLY initialization
      if (countryData) {
        if (countryData.isQualified) {
          grandFinalOnlyInitialAssignments[country.code] =
            CountryAssignmentGroup.GRAND_FINAL;
        } else {
          grandFinalOnlyInitialAssignments[country.code] =
            CountryAssignmentGroup.NOT_QUALIFIED;
        }
      } else {
        grandFinalOnlyInitialAssignments[country.code] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    });

    setAssignments({
      [EventMode.SEMI_FINALS_AND_GRAND_FINAL]: semiFinalsInitialAssignments,
      [EventMode.GRAND_FINAL_ONLY]: grandFinalOnlyInitialAssignments,
    });
  }, [allCountriesForYear, getAllCountries, customCountries]);

  const handleCountryAssignment = (
    countryCode: string,
    group: CountryAssignmentGroup,
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [countryCode]: group,
      },
    }));
  };

  const handleBulkCountryAssignment = (
    countries: BaseCountry[],
    group: CountryAssignmentGroup,
  ) => {
    const countryCodes = countries.map((c) => c.code);

    setAssignments((prev) => {
      const newAssignments = { ...prev[activeTab] };

      countryCodes.forEach((code) => {
        newAssignments[code] = group;
      });

      return {
        ...prev,
        [activeTab]: newAssignments,
      };
    });
  };

  const getCountryGroupAssignment = (country: BaseCountry) => {
    return assignments[activeTab]?.[country.code];
  };

  const countryGroups = useMemo(() => {
    const currentAssignments = assignments[activeTab] || {};
    const allCountries = getAllCountries();

    const initialGroups: Record<string, BaseCountry[]> = {
      [CountryAssignmentGroup.AUTO_QUALIFIER]: [],
      [CountryAssignmentGroup.GRAND_FINAL]: [],
      [CountryAssignmentGroup.SF1]: [],
      [CountryAssignmentGroup.SF2]: [],
      [CountryAssignmentGroup.NOT_QUALIFIED]: [],
      [CountryAssignmentGroup.NOT_PARTICIPATING]: [],
    };

    allCountries.forEach((country) => {
      const group = currentAssignments[country.code];

      if (group && initialGroups[group]) {
        initialGroups[group].push(country);
      }
    });

    Object.values(initialGroups).forEach((group) => {
      group.sort((a, b) => a.name.localeCompare(b.name));
    });

    return {
      autoQualifiers: initialGroups[CountryAssignmentGroup.AUTO_QUALIFIER],
      grandFinalQualifiers: initialGroups[CountryAssignmentGroup.GRAND_FINAL],
      sf1Countries: initialGroups[CountryAssignmentGroup.SF1],
      sf2Countries: initialGroups[CountryAssignmentGroup.SF2],
      notQualifiedCountries:
        initialGroups[CountryAssignmentGroup.NOT_QUALIFIED],
      notParticipatingCountries:
        initialGroups[CountryAssignmentGroup.NOT_PARTICIPATING],
      assignments: assignments[activeTab],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, activeTab, customCountries, getAllCountries]);

  return {
    countryGroups,
    handleCountryAssignment,
    handleBulkCountryAssignment,
    getCountryGroupAssignment,
    areAssignmentsLoaded: Object.keys(assignments[activeTab]).length > 0,
  };
};
