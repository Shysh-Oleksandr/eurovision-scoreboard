'use client';

import { Ban, ChartColumn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import UserContentSection from './UserContentSection';
import UserProfileHeader from './UserProfileHeader';

import { useBlockedUserIds } from '@/api/blocks';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useBlockActions } from '@/components/moderation/useBlockActions';
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
  const tModeration = useTranslations('moderation');
  const blockedIds = useBlockedUserIds();
  const { unblockUser, isPending: isUnblocking } = useBlockActions();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [entryStatsOpen, setEntryStatsOpen] = useState(false);
  const [entryStatsCode, setEntryStatsCode] = useState<string | null>(null);

  if (!user) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        containerClassName="!w-[min(100%,750px)]"
        fullScreenOnPhone
        fixedHeight
        overlayClassName="!z-[1100]"
        bottomContent={<ModalBottomCloseButton onClose={onClose} />}
      >
        <div className="mb-4">
          <UserProfileHeader
            user={user}
            additionalContent={
              <Button
                onClick={() => setLeaderboardOpen(true)}
                Icon={<ChartColumn className="sm:size-6 size-5" />}
                className={`!py-2 !px-4 !text-base`}
                title={t('buttonTitle')}
              />
            }
          />
        </div>
        {blockedIds.has(user._id) ? (
          <div className="flex flex-col items-center text-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-8">
            <Ban className="size-8 text-white/50" />
            <p className="text-white/80">{tModeration('blockedProfile')}</p>
            <Button
              variant="tertiary"
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
