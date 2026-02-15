'use client';

import React from 'react';

import UserContentSection from './UserContentSection';
import UserProfileHeader from './UserProfileHeader';

import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import type { Contest } from '@/types/contest';
import type { ThemeCreator, CustomTheme } from '@/types/customTheme';

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
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,750px)]"
      fixedHeight
      overlayClassName="!z-[1002]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="mb-4">
        <UserProfileHeader user={user} />
      </div>
      <UserContentSection
        userId={user._id}
        onDuplicate={onDuplicate}
        onEditTheme={onEditTheme}
        onEditContest={onEditContest}
        onLoadContest={onLoadContest}
      />
    </Modal>
  );
};

export default UserProfileModal;
