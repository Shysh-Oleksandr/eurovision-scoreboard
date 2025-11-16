import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import ThemeListItem from './ThemeListItem';
import ThemesSearchHeader from './ThemesSearchHeader';
import ThemesSortBadges, { PublicSortKey } from './ThemesSortBadges';

import { api } from '@/api/client';
import {
  useApplyThemeMutation,
  usePublicThemesQuery,
  useToggleLikeThemeMutation,
  useToggleSaveThemeMutation,
  useThemesStateQuery,
} from '@/api/themes';
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
  const t = useTranslations('widgets.themes');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>('latest');
  const [page, setPage] = useState(1);

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

  const { data } = usePublicThemesQuery({
    page,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
  });

  const { mutateAsync: toggleLike } = useToggleLikeThemeMutation();
  const { mutateAsync: toggleSave } = useToggleSaveThemeMutation();
  const { mutateAsync: applyThemeToProfile } = useApplyThemeMutation();
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);
  const user = useAuthStore((state) => state.user);

  const themeIds = data?.themes?.map((t) => t._id) || [];
  const { data: themeState } = useThemesStateQuery(
    themeIds,
    !!themeIds.length && !!user,
  );

  useEffectOnce(onLoaded);

  const handleApply = async (theme: CustomTheme) => {
    try {
      // Fetch the latest version before applying
      const { data: latest } = await api.get(`/themes/${theme._id}`);

      // Apply locally (immediate)
      applyCustomTheme(latest);

      // Save to profile (sync across devices)
      if (user) {
        await applyThemeToProfile(theme._id);
      }

      toast.success(t('themeAppliedSuccessfully', { name: latest.name }));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to save theme to profile',
      );
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await toggleLike(id);

      toast.success(
        res.liked ? t('themeLikedSuccessfully') : t('themeUnlikedSuccessfully'),
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to like theme');
    }
  };

  const handleSave = async (id: string, savedByMe: boolean) => {
    try {
      if (savedByMe) {
        if (
          !window.confirm(
            t('areYouSureYouWantToRemoveThisThemeFromYourSavedThemes'),
          )
        ) {
          return;
        }
      }
      const res = await toggleSave(id);

      toast.success(
        res.saved ? t('themeSavedSuccessfully') : t('themeRemovedFromSaved'),
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save theme');
    }
  };

  return (
    <div className="sm:space-y-4 space-y-2">
      <div className="sm:space-y-3 space-y-2">
        <ThemesSearchHeader
          search={search}
          onSearchChange={(search: string) => {
            setSearch(search);
            setPage(1);
          }}
        />
        <ThemesSortBadges
          value={sortKey}
          onChange={(k: PublicSortKey) => {
            setSortKey(k);
            setPage(1);
          }}
        />
      </div>
      <h3 className="text-white text-lg font-bold">
        {t('foundNThemes', { count: data?.total ?? 0 })}
      </h3>

      {data && data.themes.length > 0 ? (
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
                {t('previous')}
              </Button>
              <span className="px-3 py-1 text-white text-sm font-medium">
                {t('pageNOfM', { page, totalPages: data.totalPages })}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
              >
                {t('next')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center sm:py-12 py-8">
          <p className="text-white/70">
            {t('noPublicThemesFoundMatchingYourSearch')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicThemes;
