import {
  CONTEST_TYPE_NAMES,
  CONTEST_TYPE_SHORT_NAMES,
  CONTEST_TYPE_TAB_NAMES,
  ContestType,
} from '@/data/contestTypes';

/** The series in the order the picker shows them. */
export const PICKER_SERIES: readonly ContestType[] = ['esc', 'jesc', 'asia'];

/** One choice in the header's contest or theme picker. */
export interface PickerItem {
  /** The value the field stores: a contest / theme key (`2026`, `JESC-2025`) or a saved id. */
  value: string;
  /** An official edition's series; none for a quick select entry. */
  series?: ContestType;
  year?: number;
  /** "Eurovision 2026", or a quick select entry's own name. */
  name: string;
  /** Contests: the host country ("Austria"), read out and searched. */
  host?: string;
  /** Contests: the host heart, or a saved contest's heart or flag. */
  imageUrl?: string;
  /** False when `imageUrl` is a rectangular flag rather than a heart. */
  isHeart?: boolean;
  /** Themes: the swatch colour. */
  color?: string;
  /** Built-in themes: a small copy of the background. */
  thumbnailUrl?: string;
}

/** Quick select first, then the series. */
export type PickerTab = ContestType | 'pinned';

const seriesIndex = (item: PickerItem) =>
  item.series ? PICKER_SERIES.indexOf(item.series) : -1;

/** Newest year first; within a year, in series order. */
export const sortNewestFirst = (items: readonly PickerItem[]) =>
  [...items].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || seriesIndex(a) - seriesIndex(b),
  );

/**
 * The Latest row: the newest edition of each series plus every edition of
 * the current year, newest first, at most `max`. Worked out from the data,
 * so a new edition shows up on its own.
 */
export const getLatestEditions = (
  editions: readonly PickerItem[],
  currentYear = new Date().getFullYear(),
  max = 4,
): PickerItem[] => {
  const newest = new Map<ContestType, number>();

  editions.forEach(({ series, year }) => {
    if (series && year)
      newest.set(series, Math.max(newest.get(series) ?? 0, year));
  });

  return sortNewestFirst(
    editions.filter(
      ({ series, year }) =>
        !!series && (year === newest.get(series) || year === currentYear),
    ),
  ).slice(0, max);
};

/**
 * The tabs: Quick select when it has entries, then each series, leaving out
 * a series whose editions all show in Latest anyway (ESC Asia while it has
 * one edition).
 */
export const getPickerTabs = (
  pinned: readonly PickerItem[],
  editions: readonly PickerItem[],
  latest: readonly PickerItem[],
): PickerTab[] => {
  const inLatest = new Set(latest.map((item) => item.value));
  const tabs: PickerTab[] = pinned.length ? ['pinned'] : [];

  PICKER_SERIES.forEach((series) => {
    const ofSeries = editions.filter((item) => item.series === series);

    if (ofSeries.some((item) => !inLatest.has(item.value))) tabs.push(series);
  });

  return tabs;
};

export const getTabItems = (
  tab: PickerTab,
  pinned: readonly PickerItem[],
  editions: readonly PickerItem[],
): PickerItem[] =>
  tab === 'pinned'
    ? [...pinned]
    : sortNewestFirst(editions.filter((item) => item.series === tab));

/**
 * The tab the picker opens on: the one holding `value` (Quick select before
 * its series), else `fallbackSeries`'s, else the first series.
 */
export const getInitialTab = (
  tabs: readonly PickerTab[],
  value: string,
  pinned: readonly PickerItem[],
  editions: readonly PickerItem[],
  fallbackSeries?: ContestType,
): PickerTab | undefined => {
  if (tabs.includes('pinned') && pinned.some((item) => item.value === value)) {
    return 'pinned';
  }

  const series =
    editions.find((item) => item.value === value)?.series ?? fallbackSeries;

  if (series && tabs.includes(series)) return series;

  return tabs.find((tab) => tab !== 'pinned') ?? tabs[0];
};

const SERIES_SEARCH_TERMS: Record<ContestType, string> = Object.fromEntries(
  PICKER_SERIES.map((series) => [
    series,
    [
      CONTEST_TYPE_NAMES[series],
      CONTEST_TYPE_SHORT_NAMES[series],
      CONTEST_TYPE_TAB_NAMES[series],
    ].join(' '),
  ]),
) as Record<ContestType, string>;

/** Lowercase words without accents; "jesc2025" splits into "jesc" "2025". */
const toWords = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/(\p{L})(\p{N})|(\p{N})(\p{L})/gu, '$1$3 $2$4')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const searchWords = (item: PickerItem) =>
  toWords(
    [
      item.series ? SERIES_SEARCH_TERMS[item.series] : '',
      item.year ?? '',
      item.name,
      item.host ?? '',
    ].join(' '),
  );

/**
 * Every query word starts a word of the item's series names (Eurovision,
 * Junior, JESC, Asia…), year, name or host. Quick select entries first,
 * then editions newest first.
 */
export const searchPickerItems = (
  pinned: readonly PickerItem[],
  editions: readonly PickerItem[],
  query: string,
): PickerItem[] => {
  const terms = toWords(query);

  if (!terms.length) return [];

  const matches = (item: PickerItem) => {
    const words = searchWords(item);

    return terms.every((term) => words.some((word) => word.startsWith(term)));
  };

  return [
    ...pinned.filter(matches),
    ...sortNewestFirst(editions).filter(matches),
  ];
};
