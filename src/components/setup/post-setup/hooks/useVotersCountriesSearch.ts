import { useEffect, useMemo, useRef, useState } from 'react';

import { useDebounce } from '../../../../hooks/useDebounce';
import { BaseCountry, CountryAssignmentGroup } from '../../../../models';
import { CATEGORY_ORDER } from '../../constants';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const useVotersCountriesSearch = (
  availableCountries: BaseCountry[],
  currentStageId?: string,
) => {
  const [countriesSearch, setCountriesSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const debouncedSearch = useDebounce(countriesSearch, 300);
  const prevDebouncedSearchRef = useRef<string>(undefined);
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const eventStages = useScoreboardStore((state) => state.eventStages);

  const currentStage = useMemo(() => {
    return eventStages.find((s) => s.id === currentStageId);
  }, [currentStageId, eventStages]);

  const handleCountriesSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountriesSearch(e.target.value);
  };

  const clearSearch = () => {
    setCountriesSearch('');
  };

  const { groupedAvailableCountries, sortedCategories } = useMemo(() => {
    const groups: Record<string, BaseCountry[]> = {};
    const filteredAvailableCountries = availableCountries.filter((country) =>
      country.name.toLowerCase().includes(debouncedSearch.trim().toLowerCase()),
    );

    // 1) Base grouping by continent/category (original behavior)
    filteredAvailableCountries.forEach((country) => {
      const category = country.category || 'Other';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(country);
    });

    // 2) Additional participation-based groups: "In stage" and "Other stage"
    if (currentStageId) {
      const assignments = eventAssignments || {};

      filteredAvailableCountries.forEach((country) => {
        const assignedGroup = assignments[country.code];

        const participatesHere = assignedGroup === currentStageId;

        const participatesSomewhere =
          assignedGroup &&
          assignedGroup !== CountryAssignmentGroup.NOT_PARTICIPATING &&
          assignedGroup !== CountryAssignmentGroup.NOT_QUALIFIED;

        if (participatesHere || currentStage?.countries.some((c) => c.code === country.code)) {
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
  }, [availableCountries, debouncedSearch, currentStageId, eventAssignments]);

  useEffect(() => {
    if (debouncedSearch !== prevDebouncedSearchRef.current) {
      if (debouncedSearch.trim()) {
        const newExpanded: Record<string, boolean> = {};

        sortedCategories.forEach((category) => {
          newExpanded[category] = true;
        });
        setExpandedCategories(newExpanded);
      } else {
        setExpandedCategories({});
      }
    }
    prevDebouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch, sortedCategories]);

  const handleToggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return {
    countriesSearch,
    handleCountriesSearch,
    clearSearch,
    expandedCategories,
    handleToggleCategory,
    groupedAvailableCountries,
    sortedCategories,
  };
};
