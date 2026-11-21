'use client';

import { Ban, ChartColumn, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId, useState } from 'react';

import dynamic from 'next/dynamic';

import { useHandleShare } from '../../hooks/useHandleShare';

import { ProfileHeader } from './ProfileModalChrome';
import UserContentSection from './UserContentSection';
import UserProfileHeader, { ProfileActions } from './UserProfileHeader';

import { useBlockedUserIds } from '@/api/blocks';
import { useUserContentQuery } from '@/api/userContent';
import Button from '@/components/common/Button';
import FollowButton from '@/components/common/FollowButton';
import Modal from '@/components/common/Modal/Modal';
import { useBlockActions } from '@/components/moderation/useBlockActions';
import UserModerationMenu from '@/components/moderation/UserModerationMenu';
import { useAuthStore } from '@/state/useAuthStore';
import type { Contest } from '@/types/contest';
import type { ThemeCreator, CustomTheme } from '@/types/customTheme';

const MyLeaderboardModal = dynamic(
  () => import('../contests/MyLeaderboardModal'),
  { ssr: false },
);
const CountryStatsModal = dynamic(
  () => import('../contests/CountryStatsModal'),
  { ssr: false },
);

/**
 * The profile modals' frame: from 1024px the identity column beside the
 * list (`dp-profile-layout`), a band above it on smaller screens.
 */
export const PROFILE_MODAL_CONTAINER =
  '!w-[min(100%,750px)] lg:!w-[min(100%,1040px)] lg:!max-w-none';

/**
 * How many public items a fan has: the list's first page with no filters
 * (the same query the list starts with, so no extra request then).
 */
export const usePublicItemsCount = (userId: string, enabled = true) =>
  useUserContentQuery(userId, {
    page: 1,
    type: 'all',
    search: '',
    enabled,
  }).data?.total;

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ThemeCreator | null;
  onDuplicate?: (theme: CustomTheme) => void;
  onEditTheme?: (theme: CustomTheme) => void;
  onEditContest?: (contest: Contest) => void;
  onLoadContest?: (contest: Contest) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onDuplicate,
  onEditTheme,
  onEditContest,
  onLoadContest,
}) => {
  const t = useTranslations('widgets.userProfile.entryLeaderboard');
  const tProfile = useTranslations('widgets.profile');
  const tModeration = useTranslations('moderation');
  const blockedIds = useBlockedUserIds();
  const me = useAuthStore((s) => s.user);
  const { unblockUser, isPending: isUnblocking } = useBlockActions();
  const handleShare = useHandleShare();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [entryStatsOpen, setEntryStatsOpen] = useState(false);
  const [entryStatsCode, setEntryStatsCode] = useState<string | null>(null);
  const titleId = useId();

  const isBlocked = !!user && blockedIds.has(user._id);
  const publicItems = usePublicItemsCount(user?._id ?? '', !isBlocked);

  if (!user) return null;

  // Your own profile opened from a list: no Follow, no ⋯.
  const isMe = me?._id === user._id;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        containerClassName={PROFILE_MODAL_CONTAINER}
        contentClassName="dp-flat"
        fullScreenOnPhone
        fixedHeight
        overlayClassName="!z-[1100]"
        ariaLabelledBy={titleId}
        topContent={
          <ProfileHeader
            title={tProfile('title')}
            titleId={titleId}
            onClose={onClose}
          />
        }
      >
        <div className="dp-profile-layout">
          <aside className="dp-profile-aside">
            <UserProfileHeader
              user={user}
              publicItems={isBlocked ? undefined : publicItems}
              corner={isMe ? undefined : <UserModerationMenu user={user} />}
              actions={
                <ProfileActions>
                  {!isMe && (
                    <FollowButton
                      userId={user._id}
                      variant="block"
                      className="dp-profile-main"
                    />
                  )}
                  <Button
                    variant="surface"
                    size="lg"
                    className={isMe ? 'dp-profile-main' : ''}
                    onClick={() =>
                      handleShare('profile', user._id, user.name || '')
                    }
                    aria-label={tProfile('shareProfile')}
                    Icon={<Share2 className="size-[18px] flex-none" />}
                  >
                    <span className="dp-act-label">
                      {tProfile('shareProfile')}
                    </span>
                  </Button>
                  <Button
                    variant="surface"
                    size="lg"
                    onClick={() => setLeaderboardOpen(true)}
                    aria-label={t('buttonTitle')}
                    Icon={<ChartColumn className="size-[18px] flex-none" />}
                  >
                    <span className="dp-act-label">{t('buttonTitle')}</span>
                  </Button>
                </ProfileActions>
              }
            />
          </aside>

          <div className="dp-profile-main-pane">
            {isBlocked ? (
              <div className="flex flex-col items-center text-center gap-4 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-8">
                <Ban className="size-8 text-white/55" aria-hidden="true" />
                <p className="text-[13px] font-semibold text-white/80 text-balance">
                  {tModeration('blockedProfile')}
                </p>
                <Button
                  variant="surface"
                  size="md"
                  isLoading={isUnblocking}
                  onClick={() => void unblockUser(user)}
                >
                  {tModeration('unblockUser')}
                </Button>
              </div>
            ) : (
              <UserContentSection
                userId={user._id}
                onDuplicate={onDuplicate}
                onEditTheme={onEditTheme}
                onEditContest={onEditContest}
                onLoadContest={onLoadContest}
              />
            )}
          </div>
        </div>
      </Modal>

      {leaderboardOpen && (
        <MyLeaderboardModal
          isOpen={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          userId={user._id}
          userName={user.name || user.username || undefined}
          overlayClassName="!z-[1101]"
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
          onContestLoaded={() => setLeaderboardOpen(false)}
          entryCode={entryStatsCode}
          userId={user._id}
          overlayClassName="!z-[1102]"
        />
      )}
    </>
  );
};

export default UserProfileModal;
