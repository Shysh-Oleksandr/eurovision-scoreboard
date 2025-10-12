import React, { Suspense, useMemo, useState } from 'react';

import PublicThemes from './PublicThemes';
import UserThemes from './UserThemes';

import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import { useEffectOnce } from '@/hooks/useEffectOnce';

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

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: <UserThemes />,
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
              <PublicThemes onLoaded={() => setIsPublicThemesLoaded(true)} />
            )}
          </Suspense>
        ),
      },
    ],
    [activeTab, isPublicThemesLoaded],
  );

  useEffectOnce(onLoaded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,800px)]"
      contentClassName="text-white h-[60vh]"
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
      <div className="py-4 px-2">
        <TabContent
          tabs={tabsWithContent}
          activeTab={activeTab}
          preserveContent
        />
      </div>
    </Modal>
  );
};

export default ThemesModal;
