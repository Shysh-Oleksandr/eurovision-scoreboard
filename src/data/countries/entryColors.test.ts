import { describe, expect, it } from 'vitest';

import { getEntryColorsByCode, sanitizeEntryColors } from './entryColors';

import { colorToHex } from '@/helpers/colorConversion';

describe('sanitizeEntryColors', () => {
  it('keeps up to three hex colours, lower-cased', () => {
    expect(
      sanitizeEntryColors(['#C8102E', '#ffffff', '#0033a0', '#000000']),
    ).toEqual(['#c8102e', '#ffffff', '#0033a0']);
  });

  it('drops what the app can’t draw, and returns undefined for none', () => {
    expect(sanitizeEntryColors(['red', '#fff', 12, '#00ff00'])).toEqual([
      '#00ff00',
    ]);
    expect(sanitizeEntryColors([])).toBeUndefined();
    expect(sanitizeEntryColors('#c8102e')).toBeUndefined();
    expect(sanitizeEntryColors(undefined)).toBeUndefined();
  });
});

describe('getEntryColorsByCode', () => {
  it('maps codes to their colours, once per list', () => {
    const entries = [
      { code: 'custom-a', colors: ['#c8102e'] },
      { code: 'custom-b' },
      { code: 'custom-c', colors: [] },
    ];
    const byCode = getEntryColorsByCode(entries);

    expect([...byCode.keys()]).toEqual(['custom-a']);
    expect(byCode.get('custom-a')).toEqual(['#c8102e']);
    // Same list, same map: rows can keep the arrays in effect deps.
    expect(getEntryColorsByCode(entries)).toBe(byCode);
    expect(getEntryColorsByCode(entries).get('custom-a')).toBe(
      byCode.get('custom-a'),
    );
  });
});

describe('colorToHex', () => {
  it('converts the picker’s solid colours exactly', () => {
    expect(colorToHex('rgba(0, 51, 160, 1)')).toBe('#0033a0');
    expect(colorToHex('rgb(255,255,255)')).toBe('#ffffff');
    expect(colorToHex('#C8102E')).toBe('#c8102e');
    expect(colorToHex('0 0% 100%')).toBe('#ffffff');
    expect(colorToHex('linear-gradient(90deg, red, blue)')).toBeUndefined();
  });
});
