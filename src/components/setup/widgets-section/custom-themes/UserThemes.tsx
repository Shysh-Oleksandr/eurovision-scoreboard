import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import { useApplyCustomTheme } from './hooks/useApplyCustomTheme';
import ThemeListItem from './ThemeListItem';

import {
  useDeleteThemeMutation,
  useMyThemesQuery,
  useSavedThemesQuery,
  useThemesStateQuery,
  useToggleLikeThemeMutation,
  useToggleSaveThemeMutation,
} from '@/api/themes';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme, ThemeCreator } from '@/types/customTheme';

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
  onCreatorClick: (user: ThemeCreator) => void;
}

const UserThemes: React.FC<UserThemesProps> = ({
  onCreateNew,
  onEdit,
  onDuplicate,
  onCreatorClick,
}) => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>('latest');
  const [view, setView] = useState<'yours' | 'saved' | 'current'>('yours');

  const { confirm } = useConfirmation();

  const { data: themes, isLoading } = useMyThemesQuery(!!user);
  const { data: savedThemes } = useSavedThemesQuery(!!user);
  const { mutateAsync: deleteTheme } = useDeleteThemeMutation();
  const { mutateAsync: toggleSave } = useToggleSaveThemeMutation();
  const { mutateAsync: toggleLike } = useToggleLikeThemeMutation();
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);

  const handleApply = useApplyCustomTheme();

  // Collect theme IDs for state query (current and saved views)
  const themeIdsForState = [
    ...(view === 'current' && currentCustomTheme
      ? [currentCustomTheme._id]
      : []),
    ...(view === 'saved' && savedThemes
      ? savedThemes.map((t) => t._id)
      : themes?.map((t) => t._id) || []),
  ];
  const { data: themeState } = useThemesStateQuery(
    themeIdsForState,
    !!themeIdsForState.length && !!user,
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteTheme(id);
      toast.success(t('widgets.themes.themeDeletedSuccessfully'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete theme');
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await toggleLike(id);

      toast.success(
        res.liked
          ? t('widgets.themes.themeLikedSuccessfully')
          : t('widgets.themes.themeUnlikedSuccessfully'),
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to like theme');
    }
  };

  const handleSave = async (id: string, savedByMe: boolean) => {
    try {
      if (savedByMe) {
        confirm({
          key: 'remove-saved-theme',
          title: t('widgets.themes.confirmRemoveSavedTheme'),
          onConfirm: async () => {
            const res = await toggleSave(id);

            toast.success(
              res.saved
                ? t('widgets.themes.themeSavedSuccessfully')
                : t('widgets.themes.themeRemovedFromSaved'),
            );
          },
        });
      } else {
        const res = await toggleSave(id);

        toast.success(
          res.saved
            ? t('widgets.themes.themeSavedSuccessfully')
            : t('widgets.themes.themeRemovedFromSaved'),
        );
      }
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
      <div className="text-center py-8">
        <span className="loader" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-white text-center sm:py-8 py-4 flex flex-col items-center gap-4">
        <p className="text-white/70">
          {t('widgets.themes.authenticateToViewAndCreateYourOwnThemes')}
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  // Derived header and content per selected view
  const headerLabel = search.trim()
    ? t('widgets.themes.fountNThemes', { count: filteredYours?.length ?? 0 })
    : view === 'yours'
    ? t('widgets.themes.youHaveNThemes', { count: filteredYours?.length ?? 0 })
    : t('widgets.themes.youSavedNThemes', {
        count: filteredSaved?.length ?? 0,
      });

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
          onCreatorClick={onCreatorClick}
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
          quickSelectedByMe={
            !!themeState?.quickSelectedIds?.includes(currentCustomTheme._id)
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
              quickSelectedByMe={
                !!themeState?.quickSelectedIds?.includes(theme._id)
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">
            {search
              ? t('widgets.themes.noThemesFoundMatchingYourSearch')
              : t('widgets.themes.noThemesYetCreateYourFirstTheme')}
          </p>
          {!search && (
            <Button variant="tertiary" onClick={onCreateNew}>
              {t('widgets.themes.createTheme')}
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
              quickSelectedByMe={
                !!themeState?.quickSelectedIds?.includes(theme._id)
              }
              onCreatorClick={onCreatorClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">
            {search
              ? t('widgets.themes.noThemesFoundMatchingYourSearch')
              : t('widgets.themes.noSavedThemesYet')}
          </p>
        </div>
      );
  }

  return (
    <div className="sm:space-y-4 space-y-2">
      <div className="sm:space-y-3 space-y-2">
        <WidgetSearchHeader
          search={search}
          onSearchChange={setSearch}
          onCreateNew={onCreateNew}
          placeholder={t('widgets.themes.searchThemes')}
        />

        <div className="flex items-center flex-wrap justify-start gap-2">
          <Badge
            label={t('widgets.created')}
            onClick={() => setView('yours')}
            isActive={view === 'yours'}
          />
          <Badge
            label={t('widgets.saved')}
            onClick={() => setView('saved')}
            isActive={view === 'saved'}
          />
          {!!currentCustomTheme && (
            <Badge
              label={t('widgets.active')}
              onClick={() => setView('current')}
              isActive={view === 'current'}
            />
          )}
        </div>
      </div>
      {view !== 'current' && (
        <div className="space-y-1">
          <h3 className="text-white text-lg font-bold">{headerLabel}</h3>
          <WidgetSortBadges value={sortKey} onChange={setSortKey} />
        </div>
      )}

      {/* Content by view */}
      {content}
    </div>
  );
};

export default UserThemes;
