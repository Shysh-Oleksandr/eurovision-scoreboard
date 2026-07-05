import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

export type CountryMeta = { name: string; flag: string };

const STATIC_NAME: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map((c) => [c.code, c.name]),
);

// Cache the code -> {name, flag} map, rebuilt only when the custom-entries array
// identity changes. Reading the store here (not via a hook) keeps the leaf
// pair/flag components cheap; custom entries rarely change while the modal is open.
let cache: { customs: BaseCountry[]; map: Map<string, CountryMeta> } | null =
  null;

const buildMap = (): Map<string, CountryMeta> => {
  const customs = useCountriesStore.getState().customCountries;

  if (cache && cache.customs === customs) return cache.map;

  const map = new Map<string, CountryMeta>();

  for (const c of ALL_COUNTRIES) {
    map.set(c.code, { name: c.name, flag: getFlagPath(c.code) });
  }
  // Custom entries win for their own codes; getFlagPath(country) resolves their
  // uploaded flag URL (falling back to the globe when they have none).
  for (const c of customs) {
    map.set(c.code, { name: c.name, flag: getFlagPath(c) });
  }
  cache = { customs, map };

  return map;
};

/** Display name + flag src for any code, including user custom entries. */
export const getCountryMeta = (code: string): CountryMeta =>
  buildMap().get(code) ?? {
    name: STATIC_NAME[code] ?? code,
    flag: getFlagPath(code),
  };

export const countryName = (code: string): string => getCountryMeta(code).name;

export const FALLBACK_FLAG = getFlagPath('ww');
