import { describe, expect, it } from 'vitest';

import { getShortCodes } from './shortCodes';

describe('getShortCodes', () => {
  it('uses the sports codes for known countries', () => {
    expect(
      getShortCodes([
        { code: 'DE', name: 'Germany' },
        { code: 'CH', name: 'Switzerland' },
        { code: 'GB-WLS', name: 'Wales' },
      ]),
    ).toEqual({ DE: 'GER', CH: 'SUI', 'GB-WLS': 'WAL' });
  });

  it('makes a code from a custom entry name, accents dropped', () => {
    expect(
      getShortCodes([
        { code: 'custom-1', name: 'Floptropica' },
        { code: 'custom-2', name: 'Ålandia' },
        { code: 'custom-3', name: 'Rest of Floptropica' },
      ]),
    ).toEqual({ 'custom-1': 'FLO', 'custom-2': 'ALA', 'custom-3': 'ROF' });
  });

  it('keeps custom codes clear of the line-up and of each other', () => {
    const codes = getShortCodes([
      { code: 'custom-1', name: 'Swedeland' },
      { code: 'SE', name: 'Sweden' },
      { code: 'custom-2', name: 'Floptropica' },
      { code: 'custom-3', name: 'Flopland' },
    ]);

    expect(codes.SE).toBe('SWE');
    expect(codes['custom-1']).toBe('SWD');
    expect(codes['custom-2']).toBe('FLO');
    expect(codes['custom-3']).toBe('FLP');
  });

  it('keeps short names whole and numbers a name with no free code left', () => {
    const codes = getShortCodes([
      { code: 'custom-1', name: 'Oz' },
      { code: 'custom-2', name: 'Abc' },
      { code: 'custom-3', name: 'ABC' },
    ]);

    expect(codes['custom-1']).toBe('OZ');
    expect(codes['custom-2']).toBe('ABC');
    expect(codes['custom-3']).toBe('AB2');
  });
});
