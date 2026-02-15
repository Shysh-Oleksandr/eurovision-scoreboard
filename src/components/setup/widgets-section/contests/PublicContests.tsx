import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { DateRangeFilter } from '../utils/getFilterDateRange';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import ContestListItem from './ContestListItem';
import { usePublicContestActions } from './hooks/usePublicContestActions';

import { useContestsStateQuery, usePublicContestsQuery } from '@/api/contests';
import Button from '@/components/common/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';

interface PublicContestsProps {
  onLoaded?: () => void;
  onEdit: (contest: Contest) => void;
  onLoad: (contest: Contest) => void;
}

const PublicContests: React.FC<PublicContestsProps> = ({
  onLoaded,
  onEdit,
  onLoad,
}) => {
  const t = useTranslations();
  const activeContest = useGeneralStore((state) => state.activeContest);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] =
    useState<Exclude<PublicSortKey, 'copies'>>('latest');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRangeFilter>(null);
  const debouncedSearch = useDebounce(search, 400);

  const serverSortBy =
    sortKey === 'likes' ? 'likes' : sortKey === 'saves' ? 'saves' : 'createdAt';
  const serverSortOrder = sortKey === 'oldest' ? 'asc' : 'desc';

  const { data, isLoading } = usePublicContestsQuery({
    page,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });

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

  useEffectOnce(onLoaded);

  return (
    <div className="sm:space-y-4 space-y-2">
      <div className="sm:space-y-3 space-y-2">
        <WidgetSearchHeader
          search={search}
          onSearchChange={(s: string) => {
            setSearch(s);
            setPage(1);
          }}
          placeholder={t('widgets.contests.searchContests')}
        />
        <WidgetSortBadges
          value={sortKey}
          onChange={(k) => {
            setSortKey(k as any);
            setPage(1);
          }}
          hideCopies
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />
      </div>

      <h3 className="text-white text-lg font-bold">
        {`Found ${data?.total ?? 0} contests`}
      </h3>

      {isLoading ? (
        <div className="text-center sm:py-12 py-8">
          <span className="loader" />
        </div>
      ) : data && data.contests.length > 0 ? (
        <>
          <div className="grid gap-4">
            {data.contests.map((contest) => (
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

          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
              >
                {t('widgets.previous')}
              </Button>
              <span className="px-3 py-1 text-white text-sm font-medium">
                {t('widgets.pageNOfM', { page, totalPages: data.totalPages })}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
              >
                {t('widgets.next')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center sm:py-12 py-8">
          <p className="text-white/70">
            {t('widgets.contests.noContestsFoundMatchingYourSearch')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicContests;
