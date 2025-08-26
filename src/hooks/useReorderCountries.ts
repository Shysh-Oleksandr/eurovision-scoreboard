import { useMemo } from 'react';
import { Country } from '../models';
import { useMediaQuery } from './useMediaQuery';

export const useReorderCountries = (
  countries: Country[],
  customColumnCount?: number,
  isVotingOver?: boolean,
) => {
  const isTablet = useMediaQuery('(min-width: 576px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)') ;

  const reorderedCountries = useMemo(() => {
    let columnCount = 1;

    if (customColumnCount) {
      columnCount = customColumnCount;
    } else {
      if (isTablet) {
        columnCount = 2;
      }

      if (isDesktop && isVotingOver) {
        columnCount = 3;
      }
    }

    if (columnCount <= 1) {
      return countries;
    }

    const total = countries.length;
    const baseRowCount = Math.floor(total / columnCount);
    const extra = total % columnCount;

    const columns: Country[][] = [];
    let start = 0;

    for (let col = 0; col < columnCount; col++) {
      const size = baseRowCount + (col < extra ? 1 : 0);
      columns[col] = countries.slice(start, start + size);
      start += size;
    }

    const reordered: Country[] = [];
    const maxRows = Math.max(...columns.map(c => c.length));

    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < columnCount; col++) {
        if (columns[col][row]) {
          reordered.push(columns[col][row]);
        }
      }
    }

    return reordered;
  }, [countries, isTablet, isDesktop, customColumnCount, isVotingOver]);

  return reorderedCountries;
};
