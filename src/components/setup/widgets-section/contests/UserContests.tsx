import { ChartColumn, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';

import WidgetResourceGroupBadges from '../WidgetResourceGroupBadges';
import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import ContestListItem from './ContestListItem';

import {
  useContestGroupsQuery,
  useContestsStateQuery,
  useCreateContestGroupMutation,
  useDeleteContestGroupMutation,
  useDeleteContestMutation,
  useMyContestsListQuery,
  useSavedContestsListQuery,
  useToggleLikeContestMutation,
  useToggleSaveContestMutation,
  useUpdateContestGroupMutation,
} from '@/api/contests';
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
import { Contest } from '@/types/contest';

const CountryStatsPickerModal = dynamic(
  () => import('./CountryStatsPickerModal'),
  { ssr: false },
);
const CountryStatsModal = dynamic(() => import('./CountryStatsModal'), {
  ssr: false,
});

const PAGE_SIZE = 10;

type ContestSortKey = Exclude<PublicSortKey, 'copies'>;

interface UserContestsProps {
  onLoaded?: () => void;
  onCreateNew: () => void;
  onEdit?: (contest: Contest) => void;
  onLoad: (contest: Contest) => void;
}

const UserContests: React.FC<UserContestsProps> = ({
  onCreateNew,
  onEdit,
  onLoad,
}) => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const setActiveContest = useGeneralStore((state) => state.setActiveContest);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<ContestSortKey>('latest');
  const [view, setView] = useState<'yours' | 'saved' | 'current'>('yours');
  const [page, setPage] = useState(1);
  const [entryStatsPickerOpen, setEntryStatsPickerOpen] = useState(false);
  const [entryStatsOpen, setEntryStatsOpen] = useState(false);
  const [entryStatsCode, setEntryStatsCode] = useState<string | null>(null);
  const [selectedContestGroupId, setSelectedContestGroupId] = useState<
    string | null
  >(null);
  const [contestGroupModalOpen, setContestGroupModalOpen] = useState(false);
  const [contestGroupToEdit, setContestGroupToEdit] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const serverSortBy =
    sortKey === 'likes' ? 'likes' : sortKey === 'saves' ? 'saves' : 'createdAt';
  const serverSortOrder = sortKey === 'oldest' ? 'asc' : 'desc';

  const { data: contestGroups = [] } = useContestGroupsQuery(
    !!user && view === 'yours',
  );

  const { mutateAsync: createContestGroup, isPending: isCreatingContestGroup } =
    useCreateContestGroupMutation();
  const { mutateAsync: updateContestGroup, isPending: isUpdatingContestGroup } =
    useUpdateContestGroupMutation();
  const { mutateAsync: deleteContestGroup, isPending: isDeletingContestGroup } =
    useDeleteContestGroupMutation();

  useEffect(() => {
    if (
      selectedContestGroupId &&
      !contestGroups.some((g) => g._id === selectedContestGroupId)
    ) {
      setSelectedContestGroupId(null);
    }
  }, [contestGroups, selectedContestGroupId]);

  const myContestsQuery = useMyContestsListQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    groupId: selectedContestGroupId ?? undefined,
    enabled: !!user && view === 'yours',
  });

  const savedContestsQuery = useSavedContestsListQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortBy: serverSortBy,
    sortOrder: serverSortOrder,
    enabled: !!user && view === 'saved',
  });

  const { mutateAsync: deleteContest } = useDeleteContestMutation();
  const { mutateAsync: toggleSave } = useToggleSaveContestMutation();
  const { mutateAsync: toggleLike } = useToggleLikeContestMutation();

  const { confirm } = useConfirmation();

  const listData =
    view === 'yours'
      ? myContestsQuery.data
      : view === 'saved'
      ? savedContestsQuery.data
      : undefined;

  const isListLoading =
    view === 'yours'
      ? myContestsQuery.isLoading
      : view === 'saved'
      ? savedContestsQuery.isLoading
      : false;

  const contestIdsForState =
    view === 'current' && activeContest
      ? [activeContest._id]
      : listData?.contests.map((c) => c._id) ?? [];

  const { data: contestsState } = useContestsStateQuery(
    contestIdsForState,
    !!contestIdsForState.length && !!user,
  );

  const handleDelete = async (id: string) => {
    try {
      const isActive = activeContest?._id === id;

      if (isActive) {
        setActiveContest(null);
      }

      await deleteContest(id);
      toast.success('Contest deleted successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete contest');
    }
  };

  const handleLike = async (id: string) => {
    try {
      const res = await toggleLike(id);

      toast.success(
        res.liked
          ? 'Contest liked successfully'
          : 'Contest unliked successfully',
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to like contest');
    }
  };

  const handleSave = async (id: string, savedByMe: boolean) => {
    try {
      if (savedByMe) {
        confirm({
          key: 'remove-saved-contest',
          title: t('widgets.contests.confirmRemoveSavedContest'),
          onConfirm: async () => {
            const res = await toggleSave(id);

            toast.success(
              t(
                res.saved
                  ? 'widgets.contests.contestSavedSuccessfully'
                  : 'widgets.contests.contestRemovedFromSaved',
              ),
            );
          },
        });
      } else {
        const res = await toggleSave(id);

        toast.success(
          t(
            res.saved
              ? 'widgets.contests.contestSavedSuccessfully'
              : 'widgets.contests.contestRemovedFromSaved',
          ),
        );
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save contest');
    }
  };

  const setViewAndResetPage = (next: 'yours' | 'saved' | 'current') => {
    setView(next);
    setPage(1);
  };

  const contestGroupModalSaving =
    isCreatingContestGroup || isUpdatingContestGroup || isDeletingContestGroup;

  if (!user) {
    return (
      <div className="text-white text-center sm:py-8 py-4 flex flex-col items-center gap-4">
        <p className="text-white/70">
          {t('widgets.contests.authenticateToViewAndCreateYourOwnContests')}
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  const total = listData?.total ?? 0;
  const contestsOnPage = listData?.contests ?? [];
  const totalPages = listData?.totalPages ?? 0;

  const headerLabel = search.trim()
    ? t('widgets.contests.foundNContests', { count: total })
    : view === 'yours'
    ? t('widgets.contests.youHaveNContests', { count: total })
    : view === 'saved'
    ? t('widgets.contests.youSavedNContests', { count: total })
    : '';

  let content: React.ReactNode = null;

  if (view === 'current') {
    const isOwnedByUser = activeContest?.userId.toString() === user?._id;

    content = activeContest ? (
      <div className="grid gap-4">
        <ContestListItem
          key={activeContest._id}
          contest={activeContest}
          variant={isOwnedByUser ? 'user' : 'public'}
          onLoad={onLoad}
          onEdit={isOwnedByUser ? onEdit : undefined}
          onDelete={isOwnedByUser ? handleDelete : undefined}
          onLike={!isOwnedByUser ? handleLike : undefined}
          onSave={!isOwnedByUser ? handleSave : undefined}
          isActive
          likedByMe={
            !isOwnedByUser
              ? !!contestsState?.likedIds?.includes(activeContest._id)
              : undefined
          }
          savedByMe={
            !isOwnedByUser
              ? !!contestsState?.savedIds?.includes(activeContest._id)
              : undefined
          }
          quickSelectedByMe={
            !!contestsState?.quickSelectedIds?.includes(activeContest._id)
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
  } else if (contestsOnPage.length > 0) {
    content = (
      <>
        <div className="grid gap-4">
          {view === 'yours'
            ? contestsOnPage.map((contest) => (
                <ContestListItem
                  key={contest._id}
                  contest={contest}
                  variant="user"
                  onLoad={onLoad}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  isActive={activeContest?._id === contest._id}
                  quickSelectedByMe={
                    !!contestsState?.quickSelectedIds?.includes(contest._id)
                  }
                />
              ))
            : contestsOnPage.map((contest) => (
                <ContestListItem
                  key={contest._id}
                  contest={contest}
                  variant="public"
                  onLoad={onLoad}
                  onEdit={onEdit}
                  onLike={handleLike}
                  onSave={handleSave}
                  isActive={activeContest?._id === contest._id}
                  likedByMe={!!contestsState?.likedIds?.includes(contest._id)}
                  savedByMe={!!contestsState?.savedIds?.includes(contest._id)}
                  quickSelectedByMe={
                    !!contestsState?.quickSelectedIds?.includes(contest._id)
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
            ? t('widgets.contests.noContestsFoundMatchingYourSearch')
            : view === 'yours'
            ? t('widgets.contests.noContestsYetCreateYourFirstContest')
            : t('widgets.contests.noSavedContestsYet')}
        </p>
        {view === 'yours' && !debouncedSearch.trim() && (
          <Button variant="tertiary" onClick={onCreateNew}>
            {t('widgets.contests.createContest')}
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
          onCreateNew={() => {
            if (
              !activeContest ||
              activeContest.userId.toString() !== user?._id
            ) {
              onCreateNew();

              return;
            }
            confirm({
              key: 'create-new-contest',
              title: t('widgets.contests.confirmCreateNewContest'),
              description: t(
                'widgets.contests.confirmCreateNewContestDescription',
                {
                  name: activeContest.name,
                },
              ),
              onConfirm: () => {
                onCreateNew();
              },
            });
          }}
          placeholder={t('widgets.contests.searchContests')}
          extraActions={
            <Button
              onClick={() => setEntryStatsPickerOpen(true)}
              Icon={<ChartColumn className="w-6 h-6" />}
              className="justify-center whitespace-nowrap !p-3"
              title={t('widgets.contests.entryStats.pickerTitle')}
            />
          }
        />

        <div className="flex items-center flex-wrap justify-start gap-2">
          <Badge
            label={t('widgets.contests.yourContests')}
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
          {!!activeContest && (
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
              setSortKey(k as ContestSortKey);
              setPage(1);
            }}
            hideCopies
          />
          {view === 'yours' && (
            <WidgetResourceGroupBadges
              groups={contestGroups}
              selectedGroupId={selectedContestGroupId}
              onSelectAll={() => {
                setSelectedContestGroupId(null);
                setPage(1);
              }}
              onSelectGroup={(id) => {
                setSelectedContestGroupId(id);
                setPage(1);
              }}
              onAddGroup={() => {
                setContestGroupToEdit(null);
                setContestGroupModalOpen(true);
              }}
              onEditGroup={(g) => {
                setContestGroupToEdit(g);
                setContestGroupModalOpen(true);
              }}
              allLabel={t('widgets.contests.groups.all')}
              addGroupAriaLabel={t('widgets.contests.groups.addGroupAria')}
              editGroupAriaLabel={t('widgets.contests.groups.editGroupAria')}
              className="pt-1"
            />
          )}
        </div>
      )}

      {/* Content by view */}
      {content}

      <UserResourceGroupModal
        isOpen={contestGroupModalOpen}
        onClose={() => {
          setContestGroupModalOpen(false);
          setContestGroupToEdit(null);
        }}
        groupToEdit={contestGroupToEdit}
        isSaving={contestGroupModalSaving}
        confirmDeleteKey="delete-contest-group"
        confirmDeleteTitle={
          contestGroupToEdit
            ? t('settings.confirmations.deleteItem', {
                name: contestGroupToEdit.name,
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
        onCreate={(name) => createContestGroup({ name })}
        onUpdate={(id, name) => updateContestGroup({ id, name })}
        onDelete={(id) => deleteContestGroup(id)}
      />

      {entryStatsPickerOpen && (
        <CountryStatsPickerModal
          isOpen={entryStatsPickerOpen}
          onClose={() => setEntryStatsPickerOpen(false)}
          onSelectEntry={(code) => {
            setEntryStatsCode(code);
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
          }}
          onContestLoaded={() => setEntryStatsPickerOpen(false)}
          entryCode={entryStatsCode}
        />
      )}
    </div>
  );
};

export default UserContests;
