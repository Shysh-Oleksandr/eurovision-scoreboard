'use client';

import { Ban, Flag, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { blockDisplayName, useBlockActions } from './useBlockActions';

import { useBlockedUserIds } from '@/api/blocks';
import OverflowMenu, {
  type OverflowMenuEntry,
} from '@/components/common/OverflowMenu';
import { openReportDialog } from '@/state/reportDialogStore';
import { useAuthStore } from '@/state/useAuthStore';
import type { ThemeCreator } from '@/types/customTheme';

/** "…" on another user's profile: report them, block or unblock them. */
const UserModerationMenu: React.FC<{ user: ThemeCreator }> = ({ user }) => {
  const t = useTranslations('moderation');
  const me = useAuthStore((s) => s.user);
  const blockedIds = useBlockedUserIds();
  const { blockUser, unblockUser } = useBlockActions();

  if (me?._id === user._id) return null;

  const isBlocked = blockedIds.has(user._id);
  const items: OverflowMenuEntry[] = [
    {
      icon: <Flag className="size-4" />,
      label: t('reportUser'),
      onClick: () =>
        openReportDialog({
          type: 'profile',
          id: user._id,
          name: blockDisplayName(user),
        }),
    },
    ...(me
      ? [
          isBlocked
            ? {
                icon: <ShieldCheck className="size-4" />,
                label: t('unblockUser'),
                onClick: () => void unblockUser(user),
              }
            : {
                icon: <Ban className="size-4" />,
                label: t('blockUser'),
                onClick: () => blockUser(user),
                variant: 'danger' as const,
              },
        ]
      : []),
  ];

  return <OverflowMenu items={items} />;
};

export default UserModerationMenu;
