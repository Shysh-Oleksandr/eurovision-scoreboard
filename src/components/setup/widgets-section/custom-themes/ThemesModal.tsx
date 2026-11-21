'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LibraryModal, { LibraryPlace } from '../library/LibraryModal';

import PublicThemes from './PublicThemes';
import UserThemes from './UserThemes';

import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useGeneralStore } from '@/state/generalStore';
import { stripCopySuffix } from '@/theme/themeFingerprint';
import { CustomTheme } from '@/types/customTheme';

const CustomizeThemeModal = dynamic(() => import('./CustomizeThemeModal'), {
  ssr: false,
});

interface ThemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const ThemesModal: React.FC<ThemesModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations('widgets.themes');
  const themeToEdit = useGeneralStore((state) => state.themeToEdit);
  const themeToDuplicate = useGeneralStore((state) => state.themeToDuplicate);
  const setThemeToEdit = useGeneralStore((state) => state.setThemeToEdit);
  const setThemeToDuplicate = useGeneralStore(
    (state) => state.setThemeToDuplicate,
  );

  const [place, setPlace] = useState<LibraryPlace>('yours');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [initialTheme, setInitialTheme] = useState<CustomTheme | undefined>();
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (themeToEdit) {
      setInitialTheme(themeToEdit);
      setIsEditMode(true);
      setIsCustomizeModalOpen(true);
      setThemeToEdit(null);
    } else if (themeToDuplicate) {
      setInitialTheme(themeToDuplicate);
      setIsEditMode(false);
      setIsCustomizeModalOpen(true);
      setThemeToDuplicate(null);
    }
  }, [
    isOpen,
    themeToEdit,
    themeToDuplicate,
    setThemeToEdit,
    setThemeToDuplicate,
  ]);

  const handleCreateNew = () => {
    setInitialTheme(undefined);
    setIsEditMode(false);
    setIsCustomizeModalOpen(true);
  };

  const handleEdit = (theme: CustomTheme) => {
    setInitialTheme(theme);
    setIsEditMode(true);
    setIsCustomizeModalOpen(true);
  };

  const handleDuplicate = (theme: CustomTheme) => {
    setInitialTheme({ ...theme, name: stripCopySuffix(theme.name) });
    setIsEditMode(false);
    setIsCustomizeModalOpen(true);
  };

  const handleCloseCustomize = () => {
    setIsCustomizeModalOpen(false);
    setInitialTheme(undefined);
    setIsEditMode(false);
  };

  useEffectOnce(onLoaded);

  return (
    <>
      <LibraryModal
        isOpen={isOpen}
        onClose={onClose}
        title={t('title')}
        place={place}
        onPlaceChange={setPlace}
        widthClassName="!w-[min(100%,850px)]"
        renderPlace={(p) =>
          p === 'community' ? (
            <PublicThemes onDuplicate={handleDuplicate} onEdit={handleEdit} />
          ) : (
            <UserThemes
              place={p}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onBrowseCommunity={() => setPlace('community')}
            />
          )
        }
      />

      {isCustomizeModalOpen && (
        <CustomizeThemeModal
          isOpen={isCustomizeModalOpen}
          onClose={handleCloseCustomize}
          initialTheme={initialTheme}
          isEditMode={isEditMode}
        />
      )}
    </>
  );
};

export default ThemesModal;
