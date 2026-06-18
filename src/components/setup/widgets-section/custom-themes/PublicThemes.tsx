import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { DateRangeFilter } from '../utils/getFilterDateRange';
import WidgetPager from '../WidgetPager';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import { usePublicThemeActions } from './hooks/usePublicThemeActions';
import ThemeListItem from './ThemeListItem';

import { usePublicThemesQuery, useThemesStateQuery } from '@/api/themes';
import { Checkbox } from '@/components/common/Checkbox';
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
  const [hasCustomAudio, setHasCustomAudio] = useState(false);
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
    hasCustomAudio,
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
      <div className="flex items-center gap-x-2 justify-between flex-wrap">
        <h3 className="text-white text-lg font-bold">
          {t('widgets.themes.foundNThemes', { count: data?.total ?? 0 })}
        </h3>
        <Checkbox
          id="public-themes-audio-filter"
          label={t('widgets.themes.audioFilterWithAudio')}
          checked={hasCustomAudio}
          onChange={(v) => {
            setHasCustomAudio(v.target.checked);
            setPage(1);
          }}
          labelClassName="!mr-0"
        />
      </div>

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

          {data.totalPages > 1 && (
            <WidgetPager
              page={page}
              totalPages={data.totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            />
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
