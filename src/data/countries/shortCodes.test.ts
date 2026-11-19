import { describe, expect, it } from 'vitest';

import {
  getChosenShortCodes,
  getShortCodes,
  normalizeShortCode,
  suggestShortCode,
} from './shortCodes';

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

  it('uses the codes picked for custom entries and keeps others clear', () => {
    const codes = getShortCodes(
      [
        { code: 'custom-1', name: 'Floptropica' },
        { code: 'custom-2', name: 'Flopland' },
        { code: 'SE', name: 'Sweden' },
      ],
      { 'custom-2': 'FLO', SE: 'XXX' },
    );

    // Picked codes win over generated ones, never over sports codes
    expect(codes['custom-2']).toBe('FLO');
    expect(codes['custom-1']).toBe('FLP');
    expect(codes.SE).toBe('SWE');
  });

  it('keeps a picked code even when another entry has it', () => {
    const codes = getShortCodes(
      [
        { code: 'custom-1', name: 'Swedeland' },
        { code: 'SE', name: 'Sweden' },
      ],
      { 'custom-1': 'SWE' },
    );

    expect(codes['custom-1']).toBe('SWE');
    expect(codes.SE).toBe('SWE');
  });
});

describe('picked short codes', () => {
  it('normalizes what is typed', () => {
    expect(normalizeShortCode('flo')).toBe('FLO');
    expect(normalizeShortCode(' f-l o!x')).toBe('FLO');
    expect(normalizeShortCode('a\u030Ala')).toBe('ÅLA');
    expect(normalizeShortCode('ab2')).toBe('AB2');
    expect(normalizeShortCode('  ')).toBe('');
  });

  it('suggests the code a name makes on its own', () => {
    expect(suggestShortCode('Rest of Floptropica')).toBe('ROF');
    expect(suggestShortCode('Oz')).toBe('OZ');
    expect(suggestShortCode('')).toBe('');
  });

  it('reads valid codes off custom entries only', () => {
    expect(
      getChosenShortCodes([
        { code: 'custom-1', shortCode: 'FLO' },
        { code: 'custom-2' },
        { code: 'custom-3', shortCode: 'TOOLONG' },
        { code: 'custom-4', shortCode: 'a b' },
      ]),
    ).toEqual({ 'custom-1': 'FLO' });
  });
});
