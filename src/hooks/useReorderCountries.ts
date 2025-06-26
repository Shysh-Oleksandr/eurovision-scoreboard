import { useMemo } from 'react';

import { Country } from '../models';

import { useMediaQuery } from './useMediaQuery';

export const useReorderCountries = (countries: Country[]) => {
  const isTablet = useMediaQuery('(min-width: 576px)');

  const reorderedCountries = useMemo(() => {
    let columnCount = 1;

    if (isTablet) {
      columnCount = 2;
    }

    if (columnCount <= 1) {
      return countries;
    }

    const reordered: Country[] = [];
    const rowCount = Math.ceil(countries.length / columnCount);
    const columns: Country[][] = Array.from({ length: columnCount }, () => []);

    countries.forEach((country, i) => {
      const columnIndex = Math.floor(i / rowCount);

      if (columns[columnIndex]) {
        columns[columnIndex].push(country);
      }
    });

    Array.from({ length: rowCount }).forEach((_, i) => {
      Array.from({ length: columnCount }).forEach((__, j) => {
        if (columns[j]?.[i]) {
          reordered.push(columns[j][i]);
        }
      });
    });

    return reordered;
  }, [countries, isTablet]);

  return reorderedCountries;
};
