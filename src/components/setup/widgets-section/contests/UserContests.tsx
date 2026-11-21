import { ChartColumn, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import {
  DEFAULT_SORT,
  contestServerSort,
  useSortFilter,
} from '../library/libraryFilters';
import LibraryFolderRail from '../library/LibraryFolderRail';
import {
  LibraryEmpty,
  LibraryLink,
  LibraryListHeader,
  LibraryPlaceLayout,
  LibrarySignIn,
} from '../library/LibraryLayout';
import LibraryToolbar from '../library/LibraryToolbar';
import WidgetPager from '../WidgetPager';
import type { PublicSortKey } from '../WidgetSortBadges';

import ContestListItem from './ContestListItem';
import { usePublicContestActions } from './hooks/usePublicContestActions';

import {
  useContestGroupsQuery,
  useContestsStateQuery,
  useCreateContestGroupMutation,
  useDeleteContestGroupMutation,
  useDeleteContestMutation,
  useMyContestsListQuery,
  useSavedContestsListQuery,
  useUpdateContestGroupMutation,
} from '@/api/contests';
import { QueryNotice } from '@/components/offline/OfflineNotice';
import UserResourceGroupModal from '@/components/setup/UserResourceGroupModal';
import { toast } from '@/helpers/toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryView } from '@/hooks/useQueryView';
import { useIsOffline } from '@/state/connectivityStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';

const MyLeaderboardModal = dynamic(() => import('./MyLeaderboardModal'), {
  ssr: false,
});
const CountryStatsModal = dynamic(() => import('./CountryStatsModal'), {
  ssr: false,
});

const PAGE_SIZE = 10;

interface UserContestsProps {
  /** Yours: the contests you saved, in groups; Saved: others' you kept. */
  place: 'yours' | 'saved';
  /** Saves the open contest as a new one (the dialog says so). */
  onCreateNew: () => void;
  onEdit?: (contest: Contest) => void;
  onLoad: (contest: Contest) => void;
  /** Saved, empty: go and find some. */
  onBrowseCommunity?: () => void;
}

/**
 * The Contests library's Yours and Saved places. Yours opens on the
 * contest in use (when the list isn't narrowed), then your contests, by
 * group, with your entry stats on the count line.
 */
const UserContests: React.FC<UserContestsProps> = ({
  place,
  onCreateNew,
  onEdit,
  onLoad,
  onBrowseCommunity,
}) => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const offline = useIsOffline();
  const activeContest = useGeneralStore((state) => state.activeContest);
  const setActiveContest = useGeneralStore((state) => state.setActiveContest);
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
  const [myLeaderboardOpen, setMyLeaderboardOpen] = useState(false);
  const [entryStatsOpen, setEntryStatsOpen] = useState(false);
  const [entryStatsCode, setEntryStatsCode] = useState<string | null>(null);
  const [entryStatsGroupId, setEntryStatsGroupId] = useState<string | null>(
    null,
  );

  const debouncedSearch = useDebounce(search, 400);
  const { sortBy, sortOrder } = contestServerSort(sortKey);

  const { data: groups = [] } = useContestGroupsQuery(!!user && isYours);

  const { mutateAsync: createGroup, isPending: isCreatingGroup } =
    useCreateContestGroupMutation();
  const { mutateAsync: updateGroup, isPending: isUpdatingGroup } =
    useUpdateContestGroupMutation();
  const { mutateAsync: deleteGroup, isPending: isDeletingGroup } =
    useDeleteContestGroupMutation();

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
  const myContestsQuery = useMyContestsListQuery({
    ...listParams,
    groupId: groupId ?? undefined,
    enabled: !!user && isYours,
  });
  const savedContestsQuery = useSavedContestsListQuery({
    ...listParams,
    enabled: !!user && !isYours,
  });
  const listQuery = isYours ? myContestsQuery : savedContestsQuery;
  const listView = useQueryView(listQuery);
  const listData = listQuery.data;

  const { mutateAsync: deleteContest } = useDeleteContestMutation();
  const { handleLike, handleSave } = usePublicContestActions();

  // The contest in use heads Yours while the list shows everything from the top.
  const inUse =
    isYours && page === 1 && !debouncedSearch.trim() && groupId === null
      ? activeContest
      : null;
  const inUseIsMine = !!inUse && inUse.userId.toString() === user?._id;

  const contestsOnPage = listData?.contests ?? [];
  const stateIds = [
    ...(inUse ? [inUse._id] : []),
    ...contestsOnPage.map((contest) => contest._id),
  ];
  const { data: contestsState } = useContestsStateQuery(
    stateIds,
    !!stateIds.length && !!user,
  );

  const handleDelete = async (id: string) => {
    try {
      if (activeContest?._id === id) setActiveContest(null);

      await deleteContest(id);
      toast.success(t('widgets.contests.contestDeleted'));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t('widgets.contests.deleteFailed'),
      );
    }
  };

  const sortFilter = useSortFilter(
    sortKey,
    (next) => {
      setSortKey(next);
      setPage(1);
    },
    { remixable: false },
  );

  if (!user) {
    return (
      <LibrarySignIn
        message={t(
          'widgets.contests.authenticateToViewAndCreateYourOwnContests',
        )}
      />
    );
  }

  const total = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 0;
  const searching = !!debouncedSearch.trim();

  const renderContest = (contest: Contest, mine: boolean) => (
    <ContestListItem
      key={contest._id}
      contest={contest}
      variant={mine ? 'user' : 'public'}
      onLoad={onLoad}
      onEdit={onEdit}
      onDelete={mine ? handleDelete : undefined}
      onLike={mine ? undefined : handleLike}
      onSave={mine ? undefined : handleSave}
      isActive={activeContest?._id === contest._id}
      likedByMe={!!contestsState?.likedIds?.includes(contest._id)}
      savedByMe={!!contestsState?.savedIds?.includes(contest._id)}
      quickSelectedByMe={
        !!contestsState?.quickSelectedIds?.includes(contest._id)
      }
    />
  );

  const saveCurrent = {
    label: t('widgets.contests.saveCurrentContest'),
    icon: <Save className="size-[18px]" aria-hidden="true" />,
    onClick: onCreateNew,
    disabled: offline,
    title: offline ? t('offline.needsConnection') : undefined,
  };

  let list: React.ReactNode;

  if (listView !== 'ready') {
    list = (
      <QueryNotice
        view={listView}
        onRetry={() => listQuery.refetch()}
        className="py-8"
      />
    );
  } else if (contestsOnPage.length === 0) {
    list = searching ? (
      <LibraryEmpty
        message={t('widgets.contests.noContestsFoundMatchingYourSearch')}
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
        message={t('widgets.contests.noContestsYet')}
        action={saveCurrent}
      />
    ) : (
      <LibraryEmpty
        message={t('widgets.contests.savedEmpty')}
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
          {contestsOnPage.map((contest) => renderContest(contest, isYours))}
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
                ? t('widgets.contests.searchYours')
                : t('widgets.contests.searchSaved')
            }
            shortSearchPlaceholder={t('widgets.library.search')}
            filters={[sortFilter]}
            action={isYours ? saveCurrent : undefined}
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
              allLabel={t('widgets.contests.groups.allContests')}
              addLabel={t('widgets.contests.groups.newGroup')}
              editLabel={t('widgets.contests.groups.editGroupAria')}
            />
          )
        }
      >
        {inUse && (
          <>
            <LibraryListHeader label={t('widgets.library.inUse')} />
            {renderContest(inUse, inUseIsMine)}
          </>
        )}
        {(listView === 'ready' || isYours) && (
          <LibraryListHeader
            className={inUse ? 'mt-3' : ''}
            label={
              listView === 'ready'
                ? t('widgets.contests.nContests', { count: total })
                : undefined
            }
            trailing={
              isYours && (
                <LibraryLink
                  icon={<ChartColumn className="size-4" aria-hidden="true" />}
                  label={t('widgets.contests.entryStats.pickerTitle')}
                  onClick={() => setMyLeaderboardOpen(true)}
                />
              )
            }
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
          confirmDeleteKey="delete-contest-group"
          confirmDeleteTitle={
            groupToEdit
              ? t('settings.confirmations.deleteItem', {
                  name: groupToEdit.name,
                })
              : ''
          }
          confirmDeleteDescription={t(
            'widgets.contests.groups.deleteGroupConfirmDescription',
          )}
          labels={{
            createTitle: t('widgets.contests.groups.createTitle'),
            editTitle: t('widgets.contests.groups.editTitle'),
            nameRequired: t('widgets.contests.groups.nameRequired'),
            createdSuccess: t('widgets.contests.groups.createdSuccess'),
            updatedSuccess: t('widgets.contests.groups.updatedSuccess'),
            deletedSuccess: t('widgets.contests.groups.deletedSuccess'),
            failedSave: t('widgets.contests.groups.failedSave'),
            failedDelete: t('widgets.contests.groups.failedDelete'),
            nameLabel: t('common.name'),
            namePlaceholder: t('common.enterName'),
          }}
          onCreate={(name) => createGroup({ name })}
          onUpdate={(id, name) => updateGroup({ id, name })}
          onDelete={(id) => deleteGroup(id)}
        />
      )}

      {myLeaderboardOpen && (
        <MyLeaderboardModal
          isOpen={myLeaderboardOpen}
          onClose={() => setMyLeaderboardOpen(false)}
          onSelectEntry={(code, selectedGroupId) => {
            setEntryStatsCode(code);
            setEntryStatsGroupId(selectedGroupId);
            setEntryStatsOpen(true);
          }}
        />
      )}
      {entryStatsOpen && entryStatsCode && (
        <CountryStatsModal
          isOpen={entryStatsOpen}
          onClose={() => {
            setEntryStatsOpen(false);
            setEntryStatsCode(null);
            setEntryStatsGroupId(null);
          }}
          onContestLoaded={() => setMyLeaderboardOpen(false)}
          entryCode={entryStatsCode}
          initialGroupId={entryStatsGroupId}
        />
      )}
    </>
  );
};

export default UserContests;
