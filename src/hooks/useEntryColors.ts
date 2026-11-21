import { getEntryColorsByCode } from '@/data/countries/entryColors';
import { useCountriesStore } from '@/state/countriesStore';

/**
 * The colours picked for the custom entry `code` (`BaseCountry.colors`), or
 * undefined: not a custom entry, or none picked (the flag's are read). The
 * same array until the entries change, so it can sit in effect deps.
 */
export const useEntryColors = (
  code: string | null | undefined,
): string[] | undefined =>
  useCountriesStore((state) =>
    code?.startsWith('custom-')
      ? getEntryColorsByCode(state.customCountries).get(code)
      : undefined,
  );
