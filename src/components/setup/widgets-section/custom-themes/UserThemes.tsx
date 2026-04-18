import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import WidgetResourceGroupBadges from '../WidgetResourceGroupBadges';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import { useApplyCustomTheme } from './hooks/useApplyCustomTheme';
import ThemeListItem from './ThemeListItem';

import {
  useCreateThemeGroupMutation,
  useDeleteThemeGroupMutation,
  useDeleteThemeMutation,
  useMyThemesListQuery,
  useSavedThemesListQuery,
  useThemeGroupsQuery,
  useThemesStateQuery,
  useToggleLikeThemeMutation,
  useToggleSaveThemeMutation,
  useUpdateThemeGroupMutation,
} from '@/api/themes';
import { BookmarkCheckIcon } from '@/assets/icons/BookmarkCheckIcon';
import { BookmarkIcon } from '@/assets/icons/BookmarkIcon';
import { PinIcon } from '@/assets/icons/PinIcon';
import { PinSolidIcon } from '@/assets/icons/PinSolidIcon';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import UserResourceGroupModal from '@/components/setup/UserResourceGroupModal';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useDebounce } from '@/hooks/useDebounce';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

const PAGE_SIZE = 10;

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
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>('latest');
  const [view, setView] = useState<'yours' | 'saved' | 'current'>('yours');
  const [page, setPage] = useState(1);
  const [selectedThemeGroupId, setSelectedThemeGroupId] = useState<
    string | null
  >(null);
  const [themeGroupModalOpen, setThemeGroupModalOpen] = useState(false);
  const [themeGroupToEdit, setThemeGroupToEdit] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const { confirm } = useConfirmation();

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

  const { data: themeGroups = [] } = useThemeGroupsQuery(
    !!user && view === 'yours',
  );

  const { mutateAsync: createThemeGroup, isPending: isCreatingThemeGroup } =
    useCreateThemeGroupMutation();
  const { mutateAsync: updateThemeGroup, isPending: isUpdatingThemeGroup } =
    useUpdateThemeGroupMutation();
  const { mutateAsync: deleteThemeGroup, isPending: isDeletingThemeGroup } =
    useDeleteThemeGroupMutation();

  useEffect(() => {
    if (
      selectedThemeGroupId &&
      !themeGroups.some((g) => g._id === selectedThemeGroupId)
    ) {
      setSelectedThemeGroupId(null);
    }
  }, [themeGroups, selectedThemeGroupId]);

  const myThemesQuery = useMyThemesListQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    groupId: selectedThemeGroupId ?? undefined,
    enabled: !!user && view === 'yours',
  });

  const savedThemesQuery = useSavedThemesListQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    enabled: !!user && view === 'saved',
  });

  const { mutateAsync: deleteTheme } = useDeleteThemeMutation();
  const { mutateAsync: toggleSave } = useToggleSaveThemeMutation();
  const { mutateAsync: toggleLike } = useToggleLikeThemeMutation();
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);

  const handleApply = useApplyCustomTheme();

  const listData =
    view === 'yours'
      ? myThemesQuery.data
      : view === 'saved'
      ? savedThemesQuery.data
      : undefined;

  const isListLoading =
    view === 'yours'
      ? myThemesQuery.isLoading
      : view === 'saved'
      ? savedThemesQuery.isLoading
      : false;

  const themeIdsForState =
    view === 'current' && currentCustomTheme
      ? [currentCustomTheme._id]
      : listData?.themes.map((th) => th._id) ?? [];

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

  const setViewAndResetPage = (next: 'yours' | 'saved' | 'current') => {
    setView(next);
    setPage(1);
  };

  const themeGroupModalSaving =
    isCreatingThemeGroup || isUpdatingThemeGroup || isDeletingThemeGroup;

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

  const total = listData?.total ?? 0;
  const themesOnPage = listData?.themes ?? [];
  const totalPages = listData?.totalPages ?? 0;

  const headerLabel = search.trim()
    ? t('widgets.themes.foundNThemes', { count: total })
    : view === 'yours'
    ? t('widgets.themes.youHaveNThemes', { count: total })
    : view === 'saved'
    ? t('widgets.themes.youSavedNThemes', { count: total })
    : '';

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
          quickSelectedByMe={
            !!themeState?.quickSelectedIds?.includes(currentCustomTheme._id)
          }
        />
      </div>
    ) : null;
  } else if (isListLoading) {
    content = (
      <div className="text-center py-8">
        <span className="loader" />
      </div>
    );
  } else if (themesOnPage.length > 0) {
    content = (
      <>
        <div className="grid gap-4">
          {view === 'yours'
            ? themesOnPage.map((theme) => (
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
              ))
            : themesOnPage.map((theme) => (
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
                />
              ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
            >
              {t('widgets.previous')}
            </Button>
            <span className="px-3 py-1 text-white text-sm font-medium">
              {t('widgets.pageNOfM', { page, totalPages })}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="!py-1.5 !text-base sm:w-[120px] w-[100px]"
            >
              {t('widgets.next')}
            </Button>
          </div>
        )}
      </>
    );
  } else {
    content = (
      <div className="text-center py-12">
        <p className="text-white/70 mb-4">
          {debouncedSearch.trim()
            ? t('widgets.themes.noThemesFoundMatchingYourSearch')
            : view === 'yours'
            ? t('widgets.themes.noThemesYetCreateYourFirstTheme')
            : t('widgets.themes.noSavedThemesYet')}
        </p>
        {!debouncedSearch.trim() && view === 'yours' && (
          <Button variant="tertiary" onClick={onCreateNew}>
            {t('widgets.themes.createTheme')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="sm:space-y-4 space-y-2">
      <div className="sm:space-y-3 space-y-2">
        <WidgetSearchHeader
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onCreateNew={onCreateNew}
          placeholder={t('widgets.themes.searchThemes')}
        />

        <div className="flex items-center flex-wrap justify-start gap-2">
          <Badge
            label={t('widgets.created')}
            onClick={() => setViewAndResetPage('yours')}
            isActive={view === 'yours'}
            Icon={<User className="w-4 h-4 flex-none" />}
          />
          <Badge
            label={t('widgets.saved')}
            onClick={() => setViewAndResetPage('saved')}
            isActive={view === 'saved'}
            Icon={
              view === 'saved' ? (
                <BookmarkCheckIcon className="w-4 h-4 flex-none" />
              ) : (
                <BookmarkIcon className="w-4 h-4 flex-none" />
              )
            }
          />
          {!!currentCustomTheme && (
            <Badge
              label={t('widgets.active')}
              onClick={() => setViewAndResetPage('current')}
              isActive={view === 'current'}
              Icon={
                view === 'current' ? (
                  <PinSolidIcon className="w-4 h-4 flex-none" />
                ) : (
                  <PinIcon className="w-4 h-4 flex-none" />
                )
              }
            />
          )}
        </div>
      </div>
      {view !== 'current' && (
        <div className="space-y-1">
          {!(isListLoading && listData === undefined) && (
            <h3 className="text-white text-lg font-bold">{headerLabel}</h3>
          )}
          <WidgetSortBadges
            value={sortKey}
            onChange={(k: PublicSortKey) => {
              setSortKey(k);
              setPage(1);
            }}
          />
          {view === 'yours' && (
            <WidgetResourceGroupBadges
              groups={themeGroups}
              selectedGroupId={selectedThemeGroupId}
              onSelectAll={() => {
                setSelectedThemeGroupId(null);
                setPage(1);
              }}
              onSelectGroup={(id) => {
                setSelectedThemeGroupId(id);
                setPage(1);
              }}
              onAddGroup={() => {
                setThemeGroupToEdit(null);
                setThemeGroupModalOpen(true);
              }}
              onEditGroup={(g) => {
                setThemeGroupToEdit(g);
                setThemeGroupModalOpen(true);
              }}
              allLabel={t('widgets.themes.groups.all')}
              addGroupAriaLabel={t('widgets.themes.groups.addGroupAria')}
              editGroupAriaLabel={t('widgets.themes.groups.editGroupAria')}
              className="pt-1"
            />
          )}
        </div>
      )}

      {/* Content by view */}
      {content}

      <UserResourceGroupModal
        isOpen={themeGroupModalOpen}
        onClose={() => {
          setThemeGroupModalOpen(false);
          setThemeGroupToEdit(null);
        }}
        groupToEdit={themeGroupToEdit}
        isSaving={themeGroupModalSaving}
        confirmDeleteKey="delete-theme-group"
        confirmDeleteTitle={
          themeGroupToEdit
            ? t('settings.confirmations.deleteItem', {
                name: themeGroupToEdit.name,
              })
            : ''
        }
        confirmDeleteDescription={t(
          'widgets.themes.groups.deleteGroupConfirmDescription',
        )}
        labels={{
          createTitle: t('widgets.themes.groups.createTitle'),
          editTitle: t('widgets.themes.groups.editTitle'),
          nameRequired: t('widgets.themes.groups.nameRequired'),
          createdSuccess: t('widgets.themes.groups.createdSuccess'),
          updatedSuccess: t('widgets.themes.groups.updatedSuccess'),
          deletedSuccess: t('widgets.themes.groups.deletedSuccess'),
          failedSave: t('widgets.themes.groups.failedSave'),
          failedDelete: t('widgets.themes.groups.failedDelete'),
          nameLabel: t('common.name'),
          namePlaceholder: t('common.enterName'),
        }}
        onCreate={(name) => createThemeGroup({ name })}
        onUpdate={(id, name) => updateThemeGroup({ id, name })}
        onDelete={(id) => deleteThemeGroup(id)}
      />
    </div>
  );
};

export default UserThemes;
