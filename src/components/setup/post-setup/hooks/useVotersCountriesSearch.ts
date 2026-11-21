import { useMemo, useState } from 'react';

import { useDebounce } from '../../../../hooks/useDebounce';
import { BaseCountry, CountryAssignmentGroup } from '../../../../models';
import { CATEGORY_ORDER } from '../../constants';

import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * The voters pool's search and groups: the countries that don't vote yet,
 * grouped by the map (continents, all-time participants) and, in front,
 * by the stages ("In stage", "Other stage"; a country is in both kinds).
 * The search is debounced; `search` is what the field shows.
 */
export const useVotersCountriesSearch = (
  availableCountries: BaseCountry[],
  currentStageId?: string,
) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const eventStages = useScoreboardStore((state) => state.eventStages);

  const currentStage = useMemo(() => {
    return eventStages.find((s) => s.id === currentStageId);
  }, [currentStageId, eventStages]);

  const { groupedAvailableCountries, sortedCategories } = useMemo(() => {
    const groups: Record<string, BaseCountry[]> = {};
    const query = debouncedSearch.trim().toLowerCase();
    const filteredAvailableCountries = availableCountries.filter((country) =>
      country.name.toLowerCase().includes(query),
    );

    // 1) By continent / category
    filteredAvailableCountries.forEach((country) => {
      const category = country.category || 'Other';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(country);
    });

    // 2) By participation: "In stage" and "Other stage"
    if (currentStageId) {
      const assignments = eventAssignments || {};

      filteredAvailableCountries.forEach((country) => {
        const assignedGroup = assignments[country.code];

        const participatesHere = assignedGroup === currentStageId;

        const participatesSomewhere =
          assignedGroup &&
          assignedGroup !== CountryAssignmentGroup.NOT_PARTICIPATING &&
          assignedGroup !== CountryAssignmentGroup.NOT_QUALIFIED;

        if (
          participatesHere ||
          currentStage?.countries.some((c) => c.code === country.code)
        ) {
          if (!groups['In stage']) {
            groups['In stage'] = [];
          }
          groups['In stage'].push(country);
        } else if (participatesSomewhere) {
          if (!groups['Other stage']) {
            groups['Other stage'] = [];
          }
          groups['Other stage'].push(country);
        }
      });
    }

    Object.keys(groups).forEach((groupKey) => {
      groups[groupKey].sort((a, b) => a.name.localeCompare(b.name));
    });

    const FULL_ORDER = ['In stage', 'Other stage', ...CATEGORY_ORDER, 'Other'];

    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const aIndex = FULL_ORDER.indexOf(a);
      const bIndex = FULL_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    return {
      groupedAvailableCountries: groups,
      sortedCategories,
    };
  }, [
    availableCountries,
    debouncedSearch,
    currentStageId,
    eventAssignments,
    currentStage,
  ]);

  return {
    search,
    setSearch,
    /** The search the groups are filtered by (debounced). */
    query: debouncedSearch.trim(),
    groupedAvailableCountries,
    sortedCategories,
  };
};
