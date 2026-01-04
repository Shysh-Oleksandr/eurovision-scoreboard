import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import WidgetSearchHeader from '../WidgetSearchHeader';
import WidgetSortBadges, { PublicSortKey } from '../WidgetSortBadges';

import ContestListItem from './ContestListItem';

import {
  useContestsStateQuery,
  useDeleteContestMutation,
  useMyContestsQuery,
  useSavedContestsQuery,
  useToggleLikeContestMutation,
  useToggleSaveContestMutation,
} from '@/api/contests';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { Contest } from '@/types/contest';

const sortContestsBy =
  (sortKey: Exclude<PublicSortKey, 'copies'>) => (a: Contest, b: Contest) => {
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
      default:
        return 0;
    }
  };

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
  const [sortKey, setSortKey] =
    useState<Exclude<PublicSortKey, 'copies'>>('latest');
  const [view, setView] = useState<'yours' | 'saved' | 'current'>('yours');

  const { data: contests, isLoading } = useMyContestsQuery(!!user);
  const { data: savedContests } = useSavedContestsQuery(!!user);
  const { mutateAsync: deleteContest } = useDeleteContestMutation();
  const { mutateAsync: toggleSave } = useToggleSaveContestMutation();
  const { mutateAsync: toggleLike } = useToggleLikeContestMutation();

  const { confirm } = useConfirmation();

  const filteredYours = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (contests || [])
      .filter((c) => (!q ? true : c.name.toLowerCase().includes(q)))
      .sort(sortContestsBy(sortKey));
  }, [contests, search, sortKey]);

  const filteredSaved = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (savedContests || [])
      .filter((c) => (!q ? true : c.name.toLowerCase().includes(q)))
      .sort(sortContestsBy(sortKey));
  }, [savedContests, search, sortKey]);

  // Collect contest IDs for state query (current and saved views)
  const contestIdsForState = [
    ...(view === 'current' && activeContest ? [activeContest._id] : []),
    ...(view === 'saved' && filteredSaved
      ? filteredSaved.map((c) => c._id)
      : []),
  ];
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
          {t('widgets.contests.authenticateToViewAndCreateYourOwnContests')}
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  // Derived header and content per selected view
  const headerLabel = search.trim()
    ? t('widgets.contests.foundNContests', {
        count: filteredYours?.length ?? 0,
      })
    : view === 'yours'
    ? t('widgets.contests.youHaveNContests', {
        count: filteredYours?.length ?? 0,
      })
    : t('widgets.contests.youSavedNContests', {
        count: filteredSaved?.length ?? 0,
      });

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
        />
      </div>
    ) : null;
  } else {
    const list = view === 'saved' ? filteredSaved : filteredYours;

    content =
      list.length > 0 ? (
        <div className="grid gap-4">
          {list.map((contest) => (
            <ContestListItem
              key={contest._id}
              contest={contest}
              variant={view === 'yours' ? 'user' : 'public'}
              onLoad={onLoad}
              onEdit={view === 'yours' ? onEdit : onEdit}
              onDelete={view === 'yours' ? handleDelete : undefined}
              onLike={view === 'saved' ? handleLike : undefined}
              onSave={view === 'saved' ? handleSave : undefined}
              isActive={activeContest?._id === contest._id}
              likedByMe={
                view === 'saved'
                  ? !!contestsState?.likedIds?.includes(contest._id)
                  : undefined
              }
              savedByMe={
                view === 'saved'
                  ? !!contestsState?.savedIds?.includes(contest._id)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">
            {search.trim()
              ? t('widgets.contests.noContestsFoundMatchingYourSearch')
              : view === 'yours'
              ? t('widgets.contests.noContestsYetCreateYourFirstContest')
              : t('widgets.contests.noSavedContestsYet')}
          </p>
          {view === 'yours' && !search.trim() && (
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
          onSearchChange={setSearch}
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
        />

        <div className="flex items-center flex-wrap justify-start gap-2">
          <Badge
            label={t('widgets.contests.yourContests')}
            onClick={() => setView('yours')}
            isActive={view === 'yours'}
          />
          <Badge
            label={t('widgets.saved')}
            onClick={() => setView('saved')}
            isActive={view === 'saved'}
          />
          {!!activeContest && (
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
          <WidgetSortBadges
            value={sortKey}
            onChange={setSortKey as any}
            hideCopies
          />
        </div>
      )}

      {/* Content by view */}
      {content}
    </div>
  );
};

export default UserContests;
