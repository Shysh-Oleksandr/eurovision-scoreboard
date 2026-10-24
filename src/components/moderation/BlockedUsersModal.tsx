'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import Image from 'next/image';

import { useBlockActions } from './useBlockActions';

import { useBlockedUsersQuery } from '@/api/blocks';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { isGoogleAvatarUrl } from '@/helpers/isGoogleAvatarUrl';

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The signed-in user's block list, with Unblock per row. */
const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations('moderation');
  const { data, isLoading } = useBlockedUsersQuery(isOpen);
  const { unblockUser } = useBlockActions();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const users = data?.items ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1002]"
      containerClassName="!w-[min(100%,480px)]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <h3 className="text-2xl font-bold">{t('blockedUsers')}</h3>
      <p className="text-white/70 text-sm mt-1 mb-4 leading-relaxed">
        {t('blockedUsersDescription')}
      </p>

      {isLoading ? (
        <div className="text-center py-8">
          <span className="loader" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-white/60 text-center py-8">{t('noBlockedUsers')}</p>
      ) : (
        <ul className="grid gap-2">
          {users.map((user) => (
            <li
              key={user._id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
            >
              <Image
                src={user.avatarUrl || '/img/ProfileAvatarPlaceholder.png'}
                alt={user.username}
                className="size-10 rounded-full object-cover flex-none"
                width={40}
                height={40}
                unoptimized={isGoogleAvatarUrl(user.avatarUrl)}
                onError={(e) => {
                  e.currentTarget.src = '/img/ProfileAvatarPlaceholder.png';
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {user.name || user.username}
                </div>
                <div className="text-white/60 text-sm truncate">
                  @{user.username}
                </div>
              </div>
              <Button
                variant="tertiary"
                size="sm"
                isLoading={pendingId === user._id}
                disabled={!!pendingId}
                onClick={async () => {
                  setPendingId(user._id);
                  await unblockUser(user);
                  setPendingId(null);
                }}
              >
                {t('unblock')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default BlockedUsersModal;
