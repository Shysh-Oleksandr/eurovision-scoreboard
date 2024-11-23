import { useMemo } from 'react';

import { getCountriesData } from '../data/data';
import { useAppContext } from '../state/AppContext';

export const useGetCountries = () => {
  const { selectedYear } = useAppContext();

  return useMemo(() => getCountriesData(selectedYear), [selectedYear]);
};
