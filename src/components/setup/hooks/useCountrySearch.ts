import { useEffect, useMemo, useRef, useState } from 'react';

import { useDebounce } from '../../../hooks/useDebounce';
import { BaseCountry } from '../../../models';
import { CATEGORY_ORDER } from '../constants';

export const useCountrySearch = (notParticipatingCountries: BaseCountry[]) => {
  const [countriesSearch, setCountriesSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const debouncedSearch = useDebounce(countriesSearch, 300);
  const prevDebouncedSearchRef = useRef<string>(undefined);

  const handleCountriesSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountriesSearch(e.target.value);
  };

  const clearSearch = () => {
    setCountriesSearch('');
  };

  const { groupedNotParticipatingCountries, sortedCategories } = useMemo(() => {
    const groups: Record<string, BaseCountry[]> = {};
    const filteredNotParticipatingCountries = notParticipatingCountries.filter(
      (country) =>
        country.name
          .toLowerCase()
          .includes(debouncedSearch.trim().toLowerCase()),
    );

    filteredNotParticipatingCountries.forEach((country) => {
      const category = country.category || 'Other';

      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(country);
    });

    if (!groups['Custom']) {
      groups['Custom'] = [];
    }

    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a);
      const bIndex = CATEGORY_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    return {
      groupedNotParticipatingCountries: groups,
      sortedCategories,
    };
  }, [notParticipatingCountries, debouncedSearch]);

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
    groupedNotParticipatingCountries,
    sortedCategories,
  };
};
