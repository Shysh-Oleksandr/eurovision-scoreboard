import { describe, expect, it } from 'vitest';

import {
  getInitialTab,
  getLatestEditions,
  getPickerTabs,
  getTabItems,
  PickerItem,
  searchPickerItems,
} from './pickerItems';

import { ContestType } from '@/data/contestTypes';

const NAMES: Record<ContestType, string> = {
  esc: 'Eurovision',
  jesc: 'Junior Eurovision',
  asia: 'Eurovision Asia',
};

const edition = (
  series: ContestType,
  year: number,
  host = 'Sweden',
): PickerItem => ({
  value: series === 'esc' ? `${year}` : `${series.toUpperCase()}-${year}`,
  series,
  year,
  name: `${NAMES[series]} ${year}`,
  host,
});

const range = (series: ContestType, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => edition(series, from + i));

// The editions as of November 2026: ESC 2004–2027, JESC 2016–2026, Asia 2026.
const EDITIONS = [
  ...range('esc', 2004, 2025),
  edition('esc', 2026, 'Austria'),
  edition('esc', 2027, 'Bulgaria'),
  ...range('jesc', 2016, 2025),
  edition('jesc', 2026, 'Malta'),
  edition('asia', 2026, 'Thailand'),
];

const PINNED: PickerItem[] = [
  { value: 'a1b2c3d4e5f6a1b2c3d4e5f6', name: 'Nordlys Vision 2026' },
  { value: 'b1b2c3d4e5f6a1b2c3d4e5f6', name: 'Šlágr Contest' },
];

const values = (items: PickerItem[]) => items.map((item) => item.value);

describe('getLatestEditions', () => {
  it('takes the newest of each series and this year’s, newest first', () => {
    expect(values(getLatestEditions(EDITIONS, 2026))).toEqual([
      '2027',
      '2026',
      'JESC-2026',
      'ASIA-2026',
    ]);
  });

  it('drops last year’s editions once a new year starts', () => {
    expect(values(getLatestEditions(EDITIONS, 2027))).toEqual([
      '2027',
      'JESC-2026',
      'ASIA-2026',
    ]);
  });

  it('keeps at most four', () => {
    const more = [...EDITIONS, edition('jesc', 2027), edition('asia', 2027)];

    // Next year's three plus this year's three: the 2027s and ESC 2026 stay.
    expect(values(getLatestEditions(more, 2026))).toEqual([
      '2027',
      'JESC-2027',
      'ASIA-2027',
      '2026',
    ]);
  });
});

describe('getPickerTabs', () => {
  const latest = getLatestEditions(EDITIONS, 2026);

  it('leaves out a series that Latest already shows in full', () => {
    expect(getPickerTabs(PINNED, EDITIONS, latest)).toEqual([
      'pinned',
      'esc',
      'jesc',
    ]);
  });

  it('brings the series back when it has an edition Latest doesn’t show', () => {
    const more = [...EDITIONS, edition('asia', 2027)];

    expect(getPickerTabs([], more, getLatestEditions(more, 2027))).toEqual([
      'esc',
      'jesc',
      'asia',
    ]);
  });

  it('has no Quick select tab without entries', () => {
    expect(getPickerTabs([], EDITIONS, latest)).toEqual(['esc', 'jesc']);
  });
});

describe('getTabItems', () => {
  it('lists a series newest first', () => {
    const items = getTabItems('jesc', PINNED, EDITIONS);

    expect(items[0].value).toBe('JESC-2026');
    expect(items[items.length - 1].value).toBe('JESC-2016');
  });
});

describe('getInitialTab', () => {
  const tabs = getPickerTabs(
    PINNED,
    EDITIONS,
    getLatestEditions(EDITIONS, 2026),
  );

  it('opens on the tab that holds the current pick', () => {
    expect(getInitialTab(tabs, 'JESC-2019', PINNED, EDITIONS)).toBe('jesc');
    expect(getInitialTab(tabs, PINNED[0].value, PINNED, EDITIONS)).toBe(
      'pinned',
    );
  });

  it('falls back to the first series when the pick’s tab is hidden', () => {
    expect(getInitialTab(tabs, 'ASIA-2026', PINNED, EDITIONS)).toBe('esc');
  });

  it('uses the fallback series for a loaded contest outside the tabs', () => {
    expect(getInitialTab(tabs, 'someid', PINNED, EDITIONS, 'jesc')).toBe(
      'jesc',
    );
  });
});

describe('searchPickerItems', () => {
  const search = (query: string) =>
    values(searchPickerItems(PINNED, EDITIONS, query));

  it('finds a series by name or short name', () => {
    expect(search('asia')).toEqual(['ASIA-2026']);
    expect(search('junior').length).toBe(11);
    expect(search('jesc 2019')).toEqual(['JESC-2019']);
    expect(search('jesc2019')).toEqual(['JESC-2019']);
  });

  it('finds every series’ edition of a year, quick select first', () => {
    expect(search('2026')).toEqual([
      PINNED[0].value,
      '2026',
      'JESC-2026',
      'ASIA-2026',
    ]);
  });

  it('finds a host and matches word starts only', () => {
    expect(search('bulg')).toEqual(['2027']);
    expect(search('ulgaria')).toEqual([]);
  });

  it('ignores accents and case', () => {
    expect(search('slagr')).toEqual([PINNED[1].value]);
    expect(search('NORDLYS')).toEqual([PINNED[0].value]);
  });

  it('returns nothing for an empty query', () => {
    expect(search('  ')).toEqual([]);
  });
});
