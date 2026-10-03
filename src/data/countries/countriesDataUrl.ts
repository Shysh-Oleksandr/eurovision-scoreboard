import type { Year } from '@/config';
import type { ContestType } from '@/data/contestTypes';

/** Bump when any data in the countries JSON files changes. */
export const COUNTRIES_DATA_VERSION = '2026-10-03';

const COUNTRIES_FILE_PREFIXES: Record<ContestType, string> = {
  esc: 'countries',
  jesc: 'junior-countries',
  asia: 'asia-countries',
};

export const buildCountriesUrl = (year: Year, contestType: ContestType) =>
  `/data/countries/${COUNTRIES_FILE_PREFIXES[contestType]}-${year}.json?v=${COUNTRIES_DATA_VERSION}`;

/**
 * The countries preset every first visit needs (the generalStore rehydrates to
 * `INITIAL_YEAR` / ESC). It is fetched during store rehydration, i.e.
 * only once the eager bundle has evaluated — a whole round trip after the
 * document. The document preloads this URL so the data is already in the cache
 * by then; keep the two in sync by construction.
 */
export const INITIAL_COUNTRIES_URL = buildCountriesUrl('2026' as Year, 'esc');
