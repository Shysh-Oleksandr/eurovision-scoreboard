import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import {
  DEFAULT_SORT,
  serverSort,
  useSortFilter,
} from '../library/libraryFilters';
import LibraryFolderRail from '../library/LibraryFolderRail';
import {
  LibraryEmpty,
  LibraryListHeader,
  LibraryPlaceLayout,
  LibrarySignIn,
} from '../library/LibraryLayout';
import LibraryToolbar from '../library/LibraryToolbar';
import WidgetPager from '../WidgetPager';
import type { PublicSortKey } from '../WidgetSortBadges';

import { usePublicThemeActions } from './hooks/usePublicThemeActions';
import ThemeListItem from './ThemeListItem';

import {
  useCreateThemeGroupMutation,
  useDeleteThemeGroupMutation,
  useDeleteThemeMutation,
  useMyThemesListQuery,
  useSavedThemesListQuery,
  useThemeGroupsQuery,
  useThemesStateQuery,
  useUpdateThemeGroupMutation,
} from '@/api/themes';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import UserResourceGroupModal from '@/components/setup/UserResourceGroupModal';
import { toast } from '@/helpers/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryView } from '@/hooks/useQueryView';
import { useIsOffline } from '@/state/connectivityStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

const PAGE_SIZE = 10;

interface UserThemesProps {
  /** Yours: the themes you made, in groups; Saved: the ones you saved. */
  place: 'yours' | 'saved';
  onCreateNew?: () => void;
  onEdit?: (theme: CustomTheme) => void;
  onDuplicate: (theme: CustomTheme) => void;
  /** Saved, empty: go and find some. */
  onBrowseCommunity?: () => void;
}

/**
 * The Themes library's Yours and Saved places. Yours opens on the theme in
 * use (when there is one and the list isn't narrowed), then your themes,
 * by group.
 */
const UserThemes: React.FC<UserThemesProps> = ({
  place,
  onCreateNew,
  onEdit,
  onDuplicate,
  onBrowseCommunity,
}) => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const offline = useIsOffline();
  const isYours = place === 'yours';

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PublicSortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const { sortBy, sortOrder } = serverSort(sortKey);

  const { data: groups = [] } = useThemeGroupsQuery(!!user && isYours);

  const { mutateAsync: createGroup, isPending: isCreatingGroup } =
    useCreateThemeGroupMutation();
  const { mutateAsync: updateGroup, isPending: isUpdatingGroup } =
    useUpdateThemeGroupMutation();
  const { mutateAsync: deleteGroup, isPending: isDeletingGroup } =
    useDeleteThemeGroupMutation();

  // A deleted group can't stay picked.
  useEffect(() => {
    if (groupId && !groups.some((g) => g._id === groupId)) setGroupId(null);
  }, [groups, groupId]);

  const listParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  };
  const myThemesQuery = useMyThemesListQuery({
    ...listParams,
    groupId: groupId ?? undefined,
    enabled: !!user && isYours,
  });
  const savedThemesQuery = useSavedThemesListQuery({
    ...listParams,
    enabled: !!user && !isYours,
  });
  const listQuery = isYours ? myThemesQuery : savedThemesQuery;
  const listView = useQueryView(listQuery);
  const listData = listQuery.data;

  const { mutateAsync: deleteTheme } = useDeleteThemeMutation();
  const { handleLike, handleSave, handleApply } = usePublicThemeActions();
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);

  // The theme in use heads Yours while the list shows everything from the top.
  const inUse =
    isYours && page === 1 && !debouncedSearch.trim() && groupId === null
      ? currentCustomTheme
      : null;
  const inUseIsMine = !!inUse && inUse.userId.toString() === user?._id;

  const themesOnPage = listData?.themes ?? [];
  const stateIds = [
    ...(inUse ? [inUse._id] : []),
    ...themesOnPage.map((theme) => theme._id),
  ];
  const { data: themeState } = useThemesStateQuery(
    stateIds,
    !!stateIds.length && !!user,
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteTheme(id);
      toast.success(t('widgets.themes.themeDeletedSuccessfully'));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t('widgets.themes.deleteFailed'),
      );
    }
  };

  const sortFilter = useSortFilter(
    sortKey,
    (next) => {
      setSortKey(next);
      setPage(1);
    },
    { remixable: true },
  );

  if (!user) {
    return (
      <LibrarySignIn
        message={t('widgets.themes.authenticateToViewAndCreateYourOwnThemes')}
      />
    );
  }

  const total = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 0;
  const searching = !!debouncedSearch.trim();

  const stateProps = (theme: CustomTheme) => ({
    likedByMe: !!themeState?.likedIds?.includes(theme._id),
    savedByMe: !!themeState?.savedIds?.includes(theme._id),
    quickSelectedByMe: !!themeState?.quickSelectedIds?.includes(theme._id),
  });

  const renderTheme = (theme: CustomTheme, mine: boolean) => (
    <ThemeListItem
      key={theme._id}
      theme={theme}
      variant={mine ? 'user' : 'public'}
      onEdit={mine ? onEdit : undefined}
      onDelete={mine ? handleDelete : undefined}
      onApply={handleApply}
      onLike={mine ? undefined : handleLike}
      onSave={mine ? undefined : handleSave}
      isApplied={currentCustomTheme?._id === theme._id}
      onDuplicate={onDuplicate}
      {...stateProps(theme)}
    />
  );

  let list: React.ReactNode;

  if (listView !== 'ready') {
    list = (
      <QueryNotice
        view={listView}
        onRetry={() => listQuery.refetch()}
        className="py-8"
      />
    );
  } else if (themesOnPage.length === 0) {
    list = searching ? (
      <LibraryEmpty
        message={t('widgets.themes.noThemesFoundMatchingYourSearch')}
        action={{
          label: t('widgets.library.clearSearch'),
          onClick: () => {
            setSearch('');
            setPage(1);
          },
        }}
      />
    ) : isYours ? (
      <LibraryEmpty
        message={t('widgets.themes.noThemesYet')}
        action={
          onCreateNew && {
            label: t('widgets.themes.newTheme'),
            onClick: onCreateNew,
            icon: <Plus className="size-[18px]" aria-hidden="true" />,
            disabled: offline,
          }
        }
      />
    ) : (
      <LibraryEmpty
        message={t('widgets.themes.savedEmpty')}
        action={
          onBrowseCommunity && {
            label: t('widgets.library.browseCommunity'),
            onClick: onBrowseCommunity,
          }
        }
      />
    );
  } else {
    list = (
      <>
        <div className="grid gap-4">
          {themesOnPage.map((theme) => renderTheme(theme, isYours))}
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
    );
  }

  return (
    <>
      <LibraryPlaceLayout
        scrollKey={`${page}|${debouncedSearch}|${sortKey}|${groupId}`}
        toolbar={
          <LibraryToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder={
              isYours
                ? t('widgets.themes.searchYours')
                : t('widgets.themes.searchSaved')
            }
            shortSearchPlaceholder={t('widgets.library.search')}
            filters={[sortFilter]}
            action={
              isYours && onCreateNew
                ? {
                    label: t('widgets.themes.newTheme'),
                    icon: <Plus className="size-[18px]" aria-hidden="true" />,
                    onClick: onCreateNew,
                    disabled: offline,
                    title: offline ? t('offline.needsConnection') : undefined,
                  }
                : undefined
            }
          />
        }
        rail={
          isYours && (
            <LibraryFolderRail
              groups={groups}
              selectedId={groupId}
              onSelect={(id) => {
                setGroupId(id);
                setPage(1);
              }}
              onAdd={() => {
                setGroupToEdit(null);
                setGroupModalOpen(true);
              }}
              onEdit={(group) => {
                setGroupToEdit(group);
                setGroupModalOpen(true);
              }}
              allLabel={t('widgets.themes.groups.allThemes')}
              addLabel={t('widgets.themes.groups.newGroup')}
              editLabel={t('widgets.themes.groups.editGroupAria')}
            />
          )
        }
      >
        {inUse && (
          <>
            <LibraryListHeader label={t('widgets.library.inUse')} />
            {renderTheme(inUse, inUseIsMine)}
          </>
        )}
        {listView === 'ready' && (
          <LibraryListHeader
            className={inUse ? 'mt-3' : ''}
            label={t('widgets.themes.nThemes', { count: total })}
          />
        )}
        {listView === 'ready' && offline && (
          <p className="-mt-1 pb-2.5 text-[12.5px] font-semibold text-white/55">
            {t('offline.cachedCopy')}
          </p>
        )}
        {list}
      </LibraryPlaceLayout>

      {isYours && (
        <UserResourceGroupModal
          isOpen={groupModalOpen}
          onClose={() => {
            setGroupModalOpen(false);
            setGroupToEdit(null);
          }}
          groupToEdit={groupToEdit}
          isSaving={isCreatingGroup || isUpdatingGroup || isDeletingGroup}
          confirmDeleteKey="delete-theme-group"
          confirmDeleteTitle={
            groupToEdit
              ? t('settings.confirmations.deleteItem', {
                  name: groupToEdit.name,
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
          onCreate={(name) => createGroup({ name })}
          onUpdate={(id, name) => updateGroup({ id, name })}
          onDelete={(id) => deleteGroup(id)}
        />
      )}
    </>
  );
};

export default UserThemes;
