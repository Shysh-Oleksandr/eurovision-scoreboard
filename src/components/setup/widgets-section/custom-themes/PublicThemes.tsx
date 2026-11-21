import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import {
  DEFAULT_SORT,
  isFilterSet,
  LibraryMultiFilter,
  resetFilter,
  serverSort,
  useCreatedFilter,
  useSortFilter,
} from '../library/libraryFilters';
import {
  LibraryEmpty,
  LibraryListHeader,
  LibraryPlaceLayout,
} from '../library/LibraryLayout';
import LibraryToolbar from '../library/LibraryToolbar';
import WidgetPager from '../WidgetPager';
import type { PublicSortKey } from '../WidgetSortBadges';

import { usePublicThemeActions } from './hooks/usePublicThemeActions';
import ThemeListItem from './ThemeListItem';

import { usePublicThemesQuery, useThemesStateQuery } from '@/api/themes';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryView } from '@/hooks/useQueryView';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

type Include = 'audio' | 'fonts' | 'video';

interface PublicThemesProps {
  onDuplicate: (theme: CustomTheme) => void;
  onEdit: (theme: CustomTheme) => void;
}

/** The Themes library's Community place: everyone's public themes. */
const PublicThemes: React.FC<PublicThemesProps> = ({ onDuplicate, onEdit }) => {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [includes, setIncludes] = useState<Include[]>([]);
  const debouncedSearch = useDebounce(search, 400);
  const { sortBy, sortOrder } = serverSort(sortKey);

  const toFirstPage = useCallback(() => setPage(1), []);
  const { filter: createdFilter, range } = useCreatedFilter(toFirstPage);
  const sortFilter = useSortFilter(
    sortKey,
    (next) => {
      setSortKey(next);
      setPage(1);
    },
    { remixable: true },
  );
  const includesFilter: LibraryMultiFilter = {
    kind: 'multi',
    id: 'includes',
    caption: t('widgets.library.includes'),
    emptyLabel: t('widgets.library.anything'),
    values: includes,
    options: [
      { value: 'audio', label: t('widgets.library.audio') },
      { value: 'fonts', label: t('widgets.library.customFonts') },
      { value: 'video', label: t('widgets.library.backgroundVideo') },
    ],
    onChange: (values) => {
      setIncludes(values as Include[]);
      setPage(1);
    },
  };
  const narrowing = [createdFilter, includesFilter];
  const narrowed = narrowing.some(isFilterSet);
  const clearFilters = () => narrowing.forEach(resetFilter);

  const publicThemesQuery = usePublicThemesQuery({
    page,
    search: debouncedSearch,
    sortBy,
    sortOrder,
    startDate: range?.startDate,
    endDate: range?.endDate,
    hasCustomAudio: includes.includes('audio'),
    hasCustomFonts: includes.includes('fonts'),
    hasBackgroundVideo: includes.includes('video'),
  });
  const { data } = publicThemesQuery;
  const view = useQueryView(publicThemesQuery);

  const currentCustomTheme = useGeneralStore((state) => state.customTheme);
  const user = useAuthStore((state) => state.user);

  const themeIds = data?.themes?.map((theme) => theme._id) || [];
  const { data: themeState } = useThemesStateQuery(
    themeIds,
    !!themeIds.length && !!user,
  );

  const { handleLike, handleSave, handleApply } = usePublicThemeActions();

  const themes = data?.themes ?? [];
  const totalPages = data?.totalPages ?? 0;
  const searching = !!debouncedSearch.trim();

  return (
    <LibraryPlaceLayout
      scrollKey={`${page}|${debouncedSearch}|${sortKey}|${
        createdFilter.value
      }|${includes.join()}`}
      toolbar={
        <LibraryToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder={t('widgets.themes.searchCommunity')}
          shortSearchPlaceholder={t('widgets.library.search')}
          filters={[sortFilter, createdFilter, includesFilter]}
        />
      }
    >
      {view === 'ready' && (
        <LibraryListHeader
          label={t('widgets.themes.nThemes', { count: data?.total ?? 0 })}
          onClearFilters={narrowed ? clearFilters : undefined}
        />
      )}
      {view !== 'ready' ? (
        <QueryNotice
          view={view}
          onRetry={() => publicThemesQuery.refetch()}
          className="py-8"
        />
      ) : themes.length > 0 ? (
        <>
          <div className="grid gap-4">
            {themes.map((theme) => (
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
          message={t('widgets.themes.noPublicThemesFoundMatchingYourSearch')}
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
  );
};

export default PublicThemes;
