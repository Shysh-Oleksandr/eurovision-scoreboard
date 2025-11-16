import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import ThemeListItem from './ThemeListItem';
import ThemesSearchHeader from './ThemesSearchHeader';
import ThemesSortBadges, { PublicSortKey } from './ThemesSortBadges';

import { api } from '@/api/client';
import {
  useApplyThemeMutation,
  useDeleteThemeMutation,
  useMyThemesQuery,
  useSavedThemesQuery,
  useToggleLikeThemeMutation,
  useToggleSaveThemeMutation,
  useThemesStateQuery,
} from '@/api/themes';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

const sortThemesBy =
  (sortKey: PublicSortKey) => (a: CustomTheme, b: CustomTheme) => {
    switch (sortKey) {
      case 'latest':
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'likes':
        return (b.likes ?? 0) - (a.likes ?? 0);
      case 'saves':
        return (b.saves ?? 0) - (a.saves ?? 0);
      case 'copies':
        return (b.duplicatesCount ?? 0) - (a.duplicatesCount ?? 0);
      default:
        return 0;
    }
  };

interface UserThemesProps {
  onLoaded?: () => void;
  onCreateNew?: () => void;
  onEdit?: (theme: CustomTheme) => void;
  onDuplicate: (theme: CustomTheme) => void;
}

const UserThemes: React.FC<UserThemesProps> = ({
  onCreateNew,
  onEdit,
  onDuplicate,
}) => {
  const t = useTranslations('widgets.themes');
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>('latest');
  const [view, setView] = useState<'yours' | 'saved' | 'current'>('yours');

  const { data: themes, isLoading } = useMyThemesQuery(!!user);
  const { data: savedThemes } = useSavedThemesQuery(!!user);
  const { mutateAsync: deleteTheme } = useDeleteThemeMutation();
  const { mutateAsync: applyThemeToProfile } = useApplyThemeMutation();
  const { mutateAsync: toggleSave } = useToggleSaveThemeMutation();
  const { mutateAsync: toggleLike } = useToggleLikeThemeMutation();
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);

  // Collect theme IDs for state query (current and saved views)
  const themeIdsForState = [
    ...(view === 'current' && currentCustomTheme
      ? [currentCustomTheme._id]
      : []),
    ...(view === 'saved' && savedThemes ? savedThemes.map((t) => t._id) : []),
  ];
  const { data: themeState } = useThemesStateQuery(
    themeIdsForState,
    !!themeIdsForState.length && !!user,
  );

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
      console.error(error);
      toast.error(
        error?.response?.data?.message || 'Failed to save theme to profile',
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTheme(id);
      toast.success(t('themeDeletedSuccessfully'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete theme');
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

  // Filter and sort lists
  const filteredYours = themes
    ?.filter((theme) =>
      theme.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort(sortThemesBy(sortKey));

  const filteredSaved = savedThemes
    ?.filter((theme) =>
      theme.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort(sortThemesBy(sortKey));

  if (isLoading) {
    return (
      <div className="text-white text-center py-8">
        {t('loadingYourThemes')}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-white text-center sm:py-8 py-4 flex flex-col items-center gap-4">
        <p className="text-white/70">
          {t('authenticateToViewAndCreateYourOwnThemes')}
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  // Derived header and content per selected view
  const headerLabel = search.trim()
    ? t('fountNThemes', { count: filteredYours?.length ?? 0 })
    : view === 'yours'
    ? t('youHaveNThemes', { count: filteredYours?.length ?? 0 })
    : t('youSavedNThemes', { count: filteredSaved?.length ?? 0 });

  let content: React.ReactNode = null;

  if (view === 'current') {
    const isOwnedByUser = currentCustomTheme?.userId.toString() === user?._id;

    content = currentCustomTheme ? (
      <div className="grid gap-4">
        <ThemeListItem
          key={currentCustomTheme._id}
          theme={currentCustomTheme}
          variant={isOwnedByUser ? 'user' : 'public'}
          onEdit={isOwnedByUser ? onEdit : undefined}
          onDelete={isOwnedByUser ? handleDelete : undefined}
          onApply={handleApply}
          onLike={!isOwnedByUser ? handleLike : undefined}
          onSave={!isOwnedByUser ? handleSave : undefined}
          isApplied
          onDuplicate={onDuplicate}
          likedByMe={
            !isOwnedByUser
              ? !!themeState?.likedIds?.includes(currentCustomTheme._id)
              : undefined
          }
          savedByMe={
            !isOwnedByUser
              ? !!themeState?.savedIds?.includes(currentCustomTheme._id)
              : undefined
          }
        />
      </div>
    ) : null;
  } else if (view === 'yours') {
    content =
      filteredYours && filteredYours.length > 0 ? (
        <div className="grid gap-4">
          {filteredYours.map((theme) => (
            <ThemeListItem
              key={theme._id}
              theme={theme}
              variant="user"
              onEdit={onEdit}
              onDelete={handleDelete}
              onApply={handleApply}
              isApplied={currentCustomTheme?._id === theme._id}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">
            {search
              ? t('noThemesFoundMatchingYourSearch')
              : t('noThemesYetCreateYourFirstTheme')}
          </p>
          {!search && (
            <Button variant="tertiary" onClick={onCreateNew}>
              {t('createTheme')}
            </Button>
          )}
        </div>
      );
  } else {
    content =
      filteredSaved && filteredSaved.length > 0 ? (
        <div className="grid gap-4">
          {filteredSaved.map((theme) => (
            <ThemeListItem
              key={theme._id}
              theme={theme}
              variant="public"
              onApply={handleApply}
              onLike={handleLike}
              onSave={handleSave}
              isApplied={currentCustomTheme?._id === theme._id}
              onDuplicate={onDuplicate}
              likedByMe={!!themeState?.likedIds?.includes(theme._id)}
              savedByMe={!!themeState?.savedIds?.includes(theme._id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">
            {search
              ? t('noThemesFoundMatchingYourSearch')
              : t('noSavedThemesYet')}
          </p>
        </div>
      );
  }

  return (
    <div className="sm:space-y-4 space-y-2">
      <div className="sm:space-y-3 space-y-2">
        <ThemesSearchHeader
          search={search}
          onSearchChange={setSearch}
          onCreateNew={onCreateNew}
        />

        <div className="flex items-center justify-start gap-2">
          <Badge
            label={t('created')}
            onClick={() => setView('yours')}
            isActive={view === 'yours'}
          />
          <Badge
            label={t('saved')}
            onClick={() => setView('saved')}
            isActive={view === 'saved'}
          />
          {!!currentCustomTheme && (
            <Badge
              label={t('active')}
              onClick={() => setView('current')}
              isActive={view === 'current'}
            />
          )}
        </div>
      </div>
      {view !== 'current' && (
        <div className="space-y-1">
          <h3 className="text-white text-lg font-bold">{headerLabel}</h3>
          <ThemesSortBadges value={sortKey} onChange={setSortKey} />
        </div>
      )}

      {/* Content by view */}
      {content}
    </div>
  );
};

export default UserThemes;
