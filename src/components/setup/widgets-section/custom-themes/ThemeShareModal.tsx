'use client';

import React from 'react';

import { usePublicThemeActions } from './hooks/usePublicThemeActions';
import ThemeListItem from './ThemeListItem';

import { useThemesStateQuery } from '@/api/themes';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import type { CustomTheme } from '@/types/customTheme';

interface ThemeShareModalProps {
  theme: CustomTheme | null;
  onClose: () => void;
  onDuplicate: (theme: CustomTheme) => void;
  onEdit?: (theme: CustomTheme) => void;
}

const ThemeShareModal: React.FC<ThemeShareModalProps> = ({
  theme,
  onClose,
  onDuplicate,
  onEdit,
}) => {
  const user = useAuthStore((state) => state.user);
  const customTheme = useGeneralStore((state) => state.customTheme);

  const { data: themeState } = useThemesStateQuery(
    theme ? [theme._id] : [],
    !!theme && !!user,
  );
  const { handleLike, handleSave, handleApply } = usePublicThemeActions();

  if (!theme) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      containerClassName="!w-[min(100%,750px)]"
      overlayClassName="!z-[1002]"
      contentClassName="!p-4"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <ThemeListItem
        theme={theme}
        variant="public"
        onApply={handleApply}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
        onLike={handleLike}
        onSave={handleSave}
        isApplied={customTheme?._id === theme._id}
        likedByMe={!!themeState?.likedIds?.includes(theme._id)}
        savedByMe={!!themeState?.savedIds?.includes(theme._id)}
        quickSelectedByMe={!!themeState?.quickSelectedIds?.includes(theme._id)}
      />
    </Modal>
  );
};

export default ThemeShareModal;
