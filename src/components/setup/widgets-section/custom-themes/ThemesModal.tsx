import React, { Suspense, useMemo, useState } from 'react';

import PublicThemes from './PublicThemes';
import UserThemes from './UserThemes';

import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { CustomTheme } from '@/types/customTheme';

// Lazy load the customize modal
const CustomizeThemeModal = React.lazy(() => import('./CustomizeThemeModal'));

enum SettingsTab {
  YOUR_THEMES = 'Your Themes',
  PUBLIC_THEMES = 'Public Themes',
}

const tabs = [
  { value: SettingsTab.YOUR_THEMES, label: 'Your Themes' },
  { value: SettingsTab.PUBLIC_THEMES, label: 'Public Themes' },
];

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
  const [activeTab, setActiveTab] = useState(SettingsTab.YOUR_THEMES);
  const [isPublicThemesLoaded, setIsPublicThemesLoaded] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [initialTheme, setInitialTheme] = useState<CustomTheme | undefined>();
  const [isEditMode, setIsEditMode] = useState(false);

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
          <Suspense
            fallback={
              <div className="text-white text-center py-2 font-medium">
                Loading...
              </div>
            }
          >
            {(activeTab === SettingsTab.PUBLIC_THEMES ||
              isPublicThemesLoaded) && (
              <PublicThemes
                onLoaded={() => setIsPublicThemesLoaded(true)}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
              />
            )}
          </Suspense>
        ),
      },
    ],
    [activeTab, isPublicThemesLoaded],
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
        <Suspense fallback={null}>
          <CustomizeThemeModal
            isOpen={isCustomizeModalOpen}
            onClose={handleCloseCustomize}
            initialTheme={initialTheme}
            isEditMode={isEditMode}
          />
        </Suspense>
      )}
    </>
  );
};

export default ThemesModal;
