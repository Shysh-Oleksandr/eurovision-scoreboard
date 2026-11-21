import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { DateRangeFilter, getDateRange } from '../utils/getFilterDateRange';
import type { PublicSortKey } from '../WidgetSortBadges';

/**
 * The libraries' sort and filters (Themes, Contests), described once and
 * drawn twice: as caption selects in the toolbar from `2cols`, and as tiles
 * in the phone's Sort and filter sheet.
 */
export interface LibraryOption {
  value: string;
  label: string;
}

export interface LibrarySelectFilter {
  kind: 'select';
  id: string;
  caption: string;
  value: string;
  defaultValue: string;
  options: LibraryOption[];
  onChange: (value: string) => void;
}

/** Any mix of the options (themes' Includes: audio, fonts, video). */
export interface LibraryMultiFilter {
  kind: 'multi';
  id: string;
  caption: string;
  values: string[];
  /** The value shown while nothing is picked ("Anything"). */
  emptyLabel: string;
  options: LibraryOption[];
  onChange: (values: string[]) => void;
}

export type LibraryFilter = LibrarySelectFilter | LibraryMultiFilter;

/** Changed from its default: Clear can put it back. */
export const isFilterSet = (filter: LibraryFilter) =>
  filter.kind === 'select'
    ? filter.value !== filter.defaultValue
    : filter.values.length > 0;

export const resetFilter = (filter: LibraryFilter) => {
  if (filter.kind === 'select') filter.onChange(filter.defaultValue);
  else filter.onChange([]);
};

/** "Audio, Background video", or the empty label. */
export const multiFilterLabel = (filter: LibraryMultiFilter) => {
  const picked = filter.options.filter((option) =>
    filter.values.includes(option.value),
  );

  return picked.length
    ? picked.map((option) => option.label).join(', ')
    : filter.emptyLabel;
};

const SORT_LABEL_KEYS: Record<PublicSortKey, string> = {
  latest: 'latest',
  oldest: 'oldest',
  likes: 'mostLiked',
  saves: 'mostSaved',
  copies: 'mostRemixed',
};

export const DEFAULT_SORT: PublicSortKey = 'latest';

/** The theme list endpoints' `sortBy` / `sortOrder` for a sort key. */
export const serverSort = (sortKey: PublicSortKey) => ({
  sortBy: (sortKey === 'likes'
    ? 'likes'
    : sortKey === 'saves'
    ? 'saves'
    : sortKey === 'copies'
    ? 'duplicatesCount'
    : 'createdAt') as 'likes' | 'saves' | 'duplicatesCount' | 'createdAt',
  sortOrder: (sortKey === 'oldest' ? 'asc' : 'desc') as 'asc' | 'desc',
});

/** The same for contests, which have no remix count. */
export const contestServerSort = (sortKey: PublicSortKey) => {
  const { sortBy, sortOrder } = serverSort(sortKey);

  return {
    sortBy: sortBy === 'duplicatesCount' ? 'createdAt' : sortBy,
    sortOrder,
  };
};

/** Sort by: newest first by default; contests can't be remixed. */
export const useSortFilter = (
  sortKey: PublicSortKey,
  onChange: (sortKey: PublicSortKey) => void,
  { remixable }: { remixable: boolean },
): LibrarySelectFilter => {
  const t = useTranslations('widgets.sortBadges');
  const keys: PublicSortKey[] = remixable
    ? ['latest', 'oldest', 'likes', 'saves', 'copies']
    : ['latest', 'oldest', 'likes', 'saves'];

  return {
    kind: 'select',
    id: 'sort',
    caption: t('sortBy'),
    value: sortKey,
    defaultValue: DEFAULT_SORT,
    options: keys.map((key) => ({
      value: key,
      label: t(SORT_LABEL_KEYS[key]),
    })),
    onChange: (value) => onChange(value as PublicSortKey),
  };
};

export type CreatedKey =
  | 'all'
  | 'today'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth';

const CREATED_KEYS: CreatedKey[] = [
  'all',
  'today',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
];

const CREATED_LABEL_KEYS: Record<CreatedKey, string> = {
  all: 'allTime',
  today: 'today',
  thisWeek: 'thisWeek',
  lastWeek: 'lastWeek',
  thisMonth: 'thisMonth',
  lastMonth: 'lastMonth',
};

/**
 * When the community items were made (Created: All time, Today, …). The
 * date range is worked out when picked, so the query key stays put.
 */
export const useCreatedFilter = (onChange: () => void) => {
  const t = useTranslations('widgets.sortBadges');
  const [createdKey, setCreatedKey] = useState<CreatedKey>('all');
  const [range, setRange] = useState<DateRangeFilter>(null);

  const filter: LibrarySelectFilter = useMemo(
    () => ({
      kind: 'select',
      id: 'created',
      caption: t('created'),
      value: createdKey,
      defaultValue: 'all',
      options: CREATED_KEYS.map((key) => ({
        value: key,
        label: t(CREATED_LABEL_KEYS[key]),
      })),
      onChange: (value) => {
        const key = value as CreatedKey;

        setCreatedKey(key);
        setRange(key === 'all' ? null : getDateRange(key));
        onChange();
      },
    }),
    [createdKey, onChange, t],
  );

  return { filter, range };
};
