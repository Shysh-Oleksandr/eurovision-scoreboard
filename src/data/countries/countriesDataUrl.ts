import type { Year } from '@/config';

/** Bump when any data in the countries JSON files changes. */
export const COUNTRIES_DATA_VERSION = '2026-05-25';

export const buildCountriesUrl = (year: Year, isJunior: boolean) => {
  const base = isJunior
    ? `/data/countries/junior-countries-${year}.json`
    : `/data/countries/countries-${year}.json`;

  return `${base}?v=${COUNTRIES_DATA_VERSION}`;
};

/**
 * The countries preset every first visit needs (the generalStore rehydrates to
 * `INITIAL_YEAR` / non-junior). It is fetched during store rehydration, i.e.
 * only once the eager bundle has evaluated — a whole round trip after the
 * document. The document preloads this URL so the data is already in the cache
 * by then; keep the two in sync by construction.
 */
export const INITIAL_COUNTRIES_URL = buildCountriesUrl('2026' as Year, false);
