import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { DateRangeFilter } from '../utils/getFilterDateRange';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import { usePublicThemeActions } from './hooks/usePublicThemeActions';
import ThemeListItem from './ThemeListItem';

import { usePublicThemesQuery, useThemesStateQuery } from '@/api/themes';
import Button from '@/components/common/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

interface PublicThemesProps {
  onLoaded?: () => void;
  onDuplicate: (theme: CustomTheme) => void;
  onEdit: (theme: CustomTheme) => void;
}

const PublicThemes: React.FC<PublicThemesProps> = ({
  onLoaded,
  onDuplicate,
  onEdit,
}) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');
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

  const { data, isLoading } = usePublicThemesQuery({
    page,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });

  const currentCustomTheme = useGeneralStore((state) => state.customTheme);
  const user = useAuthStore((state) => state.user);

  const themeIds = data?.themes?.map((t) => t._id) || [];
  const { data: themeState } = useThemesStateQuery(
    themeIds,
    !!themeIds.length && !!user,
  );

  const { handleLike, handleSave, handleApply } = usePublicThemeActions();

  useEffectOnce(onLoaded);

  return (
    <div className="sm:space-y-4 space-y-2">
      <div className="sm:space-y-3 space-y-2">
        <WidgetSearchHeader
          search={search}
          onSearchChange={(search: string) => {
            setSearch(search);
            setPage(1);
          }}
          placeholder={t('widgets.themes.searchThemes')}
        />
        <WidgetSortBadges
          value={sortKey}
          onChange={(k: PublicSortKey) => {
            setSortKey(k);
            setPage(1);
          }}
          dateRange={dateRange}
          onDateRangeChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
        />
      </div>
      <h3 className="text-white text-lg font-bold">
        {t('widgets.themes.foundNThemes', { count: data?.total ?? 0 })}
      </h3>

      {isLoading ? (
        <div className="text-center sm:py-12 py-8">
          <span className="loader" />
        </div>
      ) : data && data.themes.length > 0 ? (
        <>
          <div className="grid gap-4">
            {data.themes.map((theme) => (
              <ThemeListItem
                key={theme._id}
                theme={theme}
                variant="public"
                onLike={handleLike}
                onSave={handleSave}
                onApply={handleApply}
                isApplied={currentCustomTheme?._id === theme._id}
                onDuplicate={onDuplicate}
                onEdit={onEdit}
                likedByMe={!!themeState?.likedIds?.includes(theme._id)}
                savedByMe={!!themeState?.savedIds?.includes(theme._id)}
                quickSelectedByMe={
                  !!themeState?.quickSelectedIds?.includes(theme._id)
                }
              />
            ))}
          </div>

          {/* Pagination */}
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
            {t('widgets.themes.noPublicThemesFoundMatchingYourSearch')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicThemes;
