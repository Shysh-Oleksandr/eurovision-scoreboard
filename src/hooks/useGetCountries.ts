import { useMemo } from 'react';

import { getCountriesData } from '../data/data';
import { useTheme } from '../theme/ThemeContext';

export const useGetCountries = () => {
  const { year } = useTheme();

  return useMemo(() => getCountriesData(year), [year]);
};
