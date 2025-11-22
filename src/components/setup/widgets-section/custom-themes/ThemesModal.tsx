'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import PublicThemes from './PublicThemes';
import UserThemes from './UserThemes';

import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { CustomTheme } from '@/types/customTheme';

const CustomizeThemeModal = dynamic(() => import('./CustomizeThemeModal'), {
  ssr: false,
});

enum SettingsTab {
  YOUR_THEMES = 'Your Themes',
  PUBLIC_THEMES = 'Public Themes',
}

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
  const [activeTab, setActiveTab] = useState(SettingsTab.YOUR_THEMES);
  const [isPublicThemesLoaded, setIsPublicThemesLoaded] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [initialTheme, setInitialTheme] = useState<CustomTheme | undefined>();
  const [isEditMode, setIsEditMode] = useState(false);

  const tabs = useMemo(
    () => [
      { value: SettingsTab.YOUR_THEMES, label: t('yourThemes') },
      { value: SettingsTab.PUBLIC_THEMES, label: t('publicThemes') },
    ],
    [t],
  );

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
    setInitialTheme({ ...theme, name: `${theme.name} (Copy)` });
    setIsEditMode(false);
    setIsCustomizeModalOpen(true);
  };

  const handleCloseCustomize = () => {
    setIsCustomizeModalOpen(false);
    setInitialTheme(undefined);
    setIsEditMode(false);
  };

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: (
          <UserThemes
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
          />
        ),
      },
      {
        ...tabs[1],
        content: (
          <>
            {(activeTab === SettingsTab.PUBLIC_THEMES ||
              isPublicThemesLoaded) && (
              <PublicThemes
                onLoaded={() => setIsPublicThemesLoaded(true)}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
              />
            )}
          </>
        ),
      },
    ],
    [activeTab, isPublicThemesLoaded, tabs],
  );

  useEffectOnce(onLoaded);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        containerClassName="!w-[min(100%,800px)]"
        contentClassName="text-white sm:h-[75vh] h-[72vh] max-h-[72vh]"
        overlayClassName="!z-[1001]"
        bottomContent={<ModalBottomCloseButton onClose={onClose} />}
        topContent={
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={(tab) => setActiveTab(tab as SettingsTab)}
            containerClassName="!rounded-none"
          />
        }
      >
        <TabContent
          tabs={tabsWithContent}
          activeTab={activeTab}
          preserveContent
        />
      </Modal>

      {/* Customize Theme Modal */}
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
