import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import ContentTypeBadges from '../ContentTypeBadges';
import ContestListItem from '../contests/ContestListItem';
import { usePublicContestActions } from '../contests/hooks/usePublicContestActions';
import { usePublicThemeActions } from '../custom-themes/hooks/usePublicThemeActions';
import ThemeListItem from '../custom-themes/ThemeListItem';
import { DateRangeFilter } from '../utils/getFilterDateRange';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import { useContestsStateQuery } from '@/api/contests';
import { useThemesStateQuery } from '@/api/themes';
import { useUserContentQuery } from '@/api/userContent';
import type { UserContentType } from '@/api/userContent';
import Button from '@/components/common/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';
import { CustomTheme } from '@/types/customTheme';

interface UserContentSectionProps {
  userId: string;
  onDuplicate?: (theme: CustomTheme) => void;
  onEditTheme?: (theme: CustomTheme) => void;
  onEditContest?: (contest: Contest) => void;
  onLoadContest?: (contest: Contest) => void;
}

const UserContentSection: React.FC<UserContentSectionProps> = ({
  userId,
  onDuplicate,
  onEditTheme,
  onEditContest,
  onLoadContest,
}) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [contentType, setContentType] = useState<UserContentType>('all');
  const [sortKey, setSortKey] = useState<PublicSortKey>('latest');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRangeFilter>(null);

  const debouncedSearch = useDebounce(search, 400);

  const serverSortBy =
    sortKey === 'likes'
      ? 'likes'
      : sortKey === 'saves'
      ? 'saves'
      : sortKey === 'copies'
      ? 'duplicatesCount'
      : 'createdAt';
  const serverSortOrder = sortKey === 'oldest' ? 'asc' : 'desc';

  const { data, isLoading } = useUserContentQuery(userId, {
    page,
    type: contentType,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    startDate: dateRange?.startDate ?? undefined,
    endDate: dateRange?.endDate ?? undefined,
  });

  const themeActions = usePublicThemeActions();
  const contestActions = usePublicContestActions();
  const user = useAuthStore((state) => state.user);
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);
  const activeContest = useGeneralStore((state) => state.activeContest);

  const themeIds = useMemo(
    () =>
      data?.items?.filter((i) => i.type === 'theme').map((i) => i.data._id) ??
      [],
    [data?.items],
  );
  const contestIds = useMemo(
    () =>
      data?.items?.filter((i) => i.type === 'contest').map((i) => i.data._id) ??
      [],
    [data?.items],
  );

  const { data: themeState } = useThemesStateQuery(
    themeIds,
    !!themeIds.length && !!user,
  );
  const { data: contestsState } = useContestsStateQuery(
    contestIds,
    !!contestIds.length && !!user,
  );

  const hideCopies = contentType === 'contests';

  return (
    <div className="sm:space-y-4 space-y-2 w-full">
      <div className="sm:space-y-3 space-y-2">
        <ContentTypeBadges
          value={contentType}
          onChange={(type) => {
            setContentType(type);
            setPage(1);
          }}
        />
        <WidgetSearchHeader
          search={search}
          onSearchChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          placeholder={t('widgets.themes.searchThemes')}
        />
        <WidgetSortBadges
          value={sortKey}
          onChange={(k) => {
            setSortKey(k);
            setPage(1);
          }}
          hideCopies={hideCopies}
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />
      </div>

      <h3 className="text-white text-lg font-bold">
        {t('widgets.foundNItems', { count: data?.total ?? 0 })}
      </h3>

      {isLoading ? (
        <div className="text-center sm:py-12 py-8">
          <span className="loader" />
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid gap-4">
            {data.items.map((item) =>
              item.type === 'theme' ? (
                <ThemeListItem
                  key={`theme-${item.data._id}`}
                  theme={item.data}
                  variant="public"
                  onLike={themeActions.handleLike}
                  onSave={themeActions.handleSave}
                  onApply={themeActions.handleApply}
                  onDuplicate={onDuplicate ?? (() => {})}
                  onEdit={onEditTheme}
                  isApplied={currentCustomTheme?._id === item.data._id}
                  likedByMe={!!themeState?.likedIds?.includes(item.data._id)}
                  savedByMe={!!themeState?.savedIds?.includes(item.data._id)}
                  quickSelectedByMe={
                    !!themeState?.quickSelectedIds?.includes(item.data._id)
                  }
                />
              ) : (
                <ContestListItem
                  key={`contest-${item.data._id}`}
                  contest={item.data}
                  variant="public"
                  onLike={contestActions.handleLike}
                  onSave={contestActions.handleSave}
                  onLoad={onLoadContest ?? (() => {})}
                  onEdit={onEditContest}
                  isActive={activeContest?._id === item.data._id}
                  likedByMe={!!contestsState?.likedIds?.includes(item.data._id)}
                  savedByMe={!!contestsState?.savedIds?.includes(item.data._id)}
                  quickSelectedByMe={
                    !!contestsState?.quickSelectedIds?.includes(item.data._id)
                  }
                />
              ),
            )}
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
                {t('widgets.pageNOfM', {
                  page,
                  totalPages: data.totalPages,
                })}
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
            {t('widgets.userProfile.noContentFound')}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserContentSection;
