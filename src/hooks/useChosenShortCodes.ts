import { useMemo } from 'react';

import { getChosenShortCodes } from '@/data/countries/shortCodes';
import { useCountriesStore } from '@/state/countriesStore';

/** The codes picked for custom entries, keyed by `code` (`getShortCodes`). */
export const useChosenShortCodes = (): Record<string, string> => {
  const customCountries = useCountriesStore((state) => state.customCountries);

  return useMemo(() => getChosenShortCodes(customCountries), [customCountries]);
};
