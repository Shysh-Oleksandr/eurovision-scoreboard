import { describe, expect, it } from 'vitest';

import {
  formatOdds,
  moveCode,
  parseOdds,
  sortCountryCodes,
} from './oddsFormat';

import { BaseCountry } from '@/models';

const country = (code: string, name: string) => ({ code, name } as BaseCountry);

describe('formatOdds', () => {
  it("writes the language's decimal mark", () => {
    expect(formatOdds(41.5, 'en')).toBe('41.5');
    expect(formatOdds(41.5, 'de')).toBe('41,5');
    expect(formatOdds(41.5, 'gr')).toBe('41,5');
  });

  it('leaves no value empty and never groups thousands', () => {
    expect(formatOdds(undefined, 'en')).toBe('');
    expect(formatOdds(1000, 'en')).toBe('1000');
  });
});

describe('parseOdds', () => {
  it('reads both decimal marks and a half-typed number', () => {
    expect(parseOdds('41.5')).toEqual({ ok: true, value: 41.5 });
    expect(parseOdds('41,5')).toEqual({ ok: true, value: 41.5 });
    expect(parseOdds('41.')).toEqual({ ok: true, value: 41 });
    expect(parseOdds(' 7 ')).toEqual({ ok: true, value: 7 });
  });

  it('treats an empty field as no odds of its own', () => {
    expect(parseOdds('')).toEqual({ ok: true, value: undefined });
  });

  it('refuses junk and values over 1000', () => {
    expect(parseOdds('abc')).toEqual({ ok: false, tooHigh: false });
    expect(parseOdds('.')).toEqual({ ok: false, tooHigh: false });
    expect(parseOdds('-3')).toEqual({ ok: false, tooHigh: false });
    expect(parseOdds('1500')).toEqual({ ok: false, tooHigh: true });
  });
});

describe('sortCountryCodes', () => {
  const countries = [
    country('SE', 'Sweden'),
    country('AL', 'Albania'),
    country('MT', 'Malta'),
  ];
  const odds = {
    SE: { juryOdds: 60, televoteOdds: 20 },
    AL: { juryOdds: 60 },
  };

  it('sorts names A to Z', () => {
    expect(sortCountryCodes(countries, odds, 'name', 'en')).toEqual([
      'AL',
      'MT',
      'SE',
    ]);
  });

  it('sorts a channel highest first, ties by name, missing odds as 50', () => {
    expect(sortCountryCodes(countries, odds, 'jury', 'en')).toEqual([
      'AL',
      'SE',
      'MT',
    ]);
    expect(sortCountryCodes(countries, odds, 'televote', 'en')).toEqual([
      'AL',
      'MT',
      'SE',
    ]);
  });
});

describe('moveCode', () => {
  it('moves one code and keeps the rest in order', () => {
    expect(moveCode(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveCode(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
});
