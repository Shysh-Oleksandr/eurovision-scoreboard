import { readdirSync, readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import oddsHistory from './oddsHistory.generated.json';

/** Same reading as scripts/generate-odds-history.mjs. */
const fromCountriesData = () => {
  const dir = path.join(process.cwd(), 'public', 'data', 'countries');
  const series: Array<[keyof typeof oddsHistory, RegExp]> = [
    ['jesc', /^junior-countries-(\d{4})\.json$/],
    ['asia', /^asia-countries-(\d{4})\.json$/],
    ['esc', /^countries-(\d{4})\.json$/],
  ];
  const history: Record<string, Record<string, number[][]>> = {
    esc: {},
    jesc: {},
    asia: {},
  };

  readdirSync(dir)
    .map((name) => {
      const match = series.find(([, pattern]) => pattern.test(name));

      return match
        ? { name, key: match[0], year: Number(match[1].exec(name)![1]) }
        : null;
    })
    .filter((file): file is NonNullable<typeof file> => !!file)
    .sort((a, b) => a.year - b.year)
    .forEach(({ name, key }) => {
      const raw = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
      const countries = Array.isArray(raw) ? raw : raw.countries;

      countries.forEach(
        (country: {
          code: string;
          juryOdds?: number;
          televoteOdds?: number;
        }) => {
          if (typeof country.juryOdds !== 'number') return;
          (history[key][country.code] ??= []).push([
            country.juryOdds,
            country.televoteOdds ?? country.juryOdds,
          ]);
        },
      );
    });

  return history;
};

describe('oddsHistory.generated.json', () => {
  it('matches the countries data (run `yarn gen:odds-history`)', () => {
    expect(oddsHistory).toEqual(fromCountriesData());
  });
});
