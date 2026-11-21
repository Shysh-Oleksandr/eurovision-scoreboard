import { useState } from 'react';

import { DateRangeFilter } from '../utils/getFilterDateRange';
import { PublicSortKey } from '../WidgetSortBadges';

import type {
  UserContentQueryParams,
  UserContentType,
} from '@/api/userContent';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Filters and page of a profile list (a fan's public items, the following
 * feed). Every filter change goes back to page 1.
 */
export const useContentListState = () => {
  const [search, setSearchState] = useState('');
  const [contentType, setContentTypeState] = useState<UserContentType>('all');
  const [sortKey, setSortKeyState] = useState<PublicSortKey>('latest');
  const [dateRange, setDateRangeState] = useState<DateRangeFilter>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const query: UserContentQueryParams = {
    page,
    type: contentType,
    search: debouncedSearch,
    sortBy:
      sortKey === 'likes'
        ? 'likes'
        : sortKey === 'saves'
        ? 'saves'
        : sortKey === 'copies'
        ? 'duplicatesCount'
        : 'createdAt',
    sortOrder: sortKey === 'oldest' ? 'asc' : 'desc',
    startDate: dateRange?.startDate ?? undefined,
    endDate: dateRange?.endDate ?? undefined,
  };

  return {
    query,
    page,
    setPage,
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    contentType,
    setContentType: (value: UserContentType) => {
      setContentTypeState(value);
      // Contests can't be copied: Most copied isn't offered there.
      if (value === 'contests' && sortKey === 'copies') {
        setSortKeyState('latest');
      }
      setPage(1);
    },
    sortKey,
    setSortKey: (value: PublicSortKey) => {
      setSortKeyState(value);
      setPage(1);
    },
    dateRange,
    setDateRange: (value: DateRangeFilter) => {
      setDateRangeState(value);
      setPage(1);
    },
  };
};

export type ContentListState = ReturnType<typeof useContentListState>;
