import { ChartColumn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import {
  DEFAULT_SORT,
  isFilterSet,
  resetFilter,
  contestServerSort,
  useCreatedFilter,
  useSortFilter,
} from '../library/libraryFilters';
import {
  LibraryEmpty,
  LibraryLink,
  LibraryListHeader,
  LibraryPlaceLayout,
} from '../library/LibraryLayout';
import LibraryToolbar from '../library/LibraryToolbar';
import WidgetPager from '../WidgetPager';
import type { PublicSortKey } from '../WidgetSortBadges';

import ContestListItem from './ContestListItem';
import GlobalLeaderboardModal from './GlobalLeaderboardModal';
import { usePublicContestActions } from './hooks/usePublicContestActions';

import { useContestsStateQuery, usePublicContestsQuery } from '@/api/contests';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryView } from '@/hooks/useQueryView';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';

interface PublicContestsProps {
  onEdit: (contest: Contest) => void;
  onLoad: (contest: Contest) => void;
}

/**
 * The Contests library's Community place: everyone's public contests, with
 * the country leaderboard they add up to on the count line.
 */
const PublicContests: React.FC<PublicContestsProps> = ({ onEdit, onLoad }) => {
  const t = useTranslations();
  const activeContest = useGeneralStore((state) => state.activeContest);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 400);
  const { sortBy, sortOrder } = contestServerSort(sortKey);

  const toFirstPage = useCallback(() => setPage(1), []);
  const { filter: createdFilter, range } = useCreatedFilter(toFirstPage);
  const sortFilter = useSortFilter(
    sortKey,
    (next) => {
      setSortKey(next);
      setPage(1);
    },
    { remixable: false },
  );
  const narrowed = isFilterSet(createdFilter);
  const clearFilters = () => resetFilter(createdFilter);

  const publicContestsQuery = usePublicContestsQuery({
    page,
    search: debouncedSearch,
    sortBy,
    sortOrder,
    startDate: range?.startDate,
    endDate: range?.endDate,
  });
  const { data } = publicContestsQuery;
  const view = useQueryView(publicContestsQuery);

  const { handleLike, handleSave } = usePublicContestActions();
  const user = useAuthStore((state) => state.user);

  const contestIds = useMemo(
    () => data?.contests?.map((c) => c._id) || [],
    [data?.contests],
  );
  const { data: contestsState } = useContestsStateQuery(
    contestIds,
    !!contestIds.length && !!user,
  );

  const contests = data?.contests ?? [];
  const totalPages = data?.totalPages ?? 0;
  const searching = !!debouncedSearch.trim();

  return (
    <>
      <LibraryPlaceLayout
        scrollKey={`${page}|${debouncedSearch}|${sortKey}|${createdFilter.value}`}
        toolbar={
          <LibraryToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder={t('widgets.contests.searchCommunity')}
            shortSearchPlaceholder={t('widgets.library.search')}
            filters={[sortFilter, createdFilter]}
          />
        }
      >
        <LibraryListHeader
          label={
            view === 'ready'
              ? t('widgets.contests.nContests', { count: data?.total ?? 0 })
              : undefined
          }
          onClearFilters={narrowed ? clearFilters : undefined}
          trailing={
            <LibraryLink
              icon={<ChartColumn className="size-4" aria-hidden="true" />}
              label={t('widgets.contests.leaderboard.chartButtonTitle')}
              onClick={() => setLeaderboardOpen(true)}
            />
          }
        />
        {view !== 'ready' ? (
          <QueryNotice
            view={view}
            onRetry={() => publicContestsQuery.refetch()}
            className="py-8"
          />
        ) : contests.length > 0 ? (
          <>
            <div className="grid gap-4">
              {contests.map((contest) => (
                <ContestListItem
                  key={contest._id}
                  contest={contest}
                  variant="public"
                  onLike={handleLike}
                  onSave={handleSave}
                  onLoad={onLoad}
                  onEdit={onEdit}
                  isActive={activeContest?._id === contest._id}
                  likedByMe={!!contestsState?.likedIds?.includes(contest._id)}
                  savedByMe={!!contestsState?.savedIds?.includes(contest._id)}
                  quickSelectedByMe={
                    !!contestsState?.quickSelectedIds?.includes(contest._id)
                  }
                />
              ))}
            </div>

            {totalPages > 1 && (
              <WidgetPager
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            )}
          </>
        ) : (
          <LibraryEmpty
            message={t('widgets.contests.noContestsFoundMatchingYourSearch')}
            action={
              narrowed
                ? {
                    label: t('widgets.library.clearFilters'),
                    onClick: clearFilters,
                  }
                : searching
                ? {
                    label: t('widgets.library.clearSearch'),
                    onClick: () => {
                      setSearch('');
                      setPage(1);
                    },
                  }
                : undefined
            }
          />
        )}
      </LibraryPlaceLayout>

      <GlobalLeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />
    </>
  );
};

export default PublicContests;
