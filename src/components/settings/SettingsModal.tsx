import React, { Suspense, useEffect, useMemo, useState } from 'react';

import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '../common/tabs/Tabs';

import { GeneralSettings } from './GeneralSettings';

import { BaseCountry } from '@/models';

const OddsSettings = React.lazy(() => import('./OddsSettings'));

enum SettingsTab {
  GENERAL = 'General',
  ODDS = 'Odds',
}

const tabs = [
  { value: SettingsTab.GENERAL, label: 'General' },
  { value: SettingsTab.ODDS, label: 'Odds' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participatingCountries: BaseCountry[];
  onLoaded: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  participatingCountries,
  onLoaded,
}) => {
  const [activeTab, setActiveTab] = useState(SettingsTab.GENERAL);

  const [isOddsLoaded, setIsOddsLoaded] = useState(false);

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: <GeneralSettings />,
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
            {(activeTab === SettingsTab.ODDS || isOddsLoaded) && (
              <OddsSettings
                countries={participatingCountries}
                onLoaded={() => setIsOddsLoaded(true)}
              />
            )}
          </Suspense>
        ),
      },
    ],
    [activeTab, isOddsLoaded, participatingCountries],
  );

  useEffect(() => {
    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%, 850px)]"
      contentClassName="!py-0 !px-2 text-white h-[70vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as SettingsTab)}
          containerClassName="!rounded-none"
        />
      }
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
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

export default SettingsModal;
