'use client';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '../common/tabs/Tabs';

import { GeneralSettings } from './GeneralSettings';

import { useEffectOnce } from '@/hooks/useEffectOnce';
import { BaseCountry } from '@/models';

const OddsSettings = dynamic(() => import('./OddsSettings'), {
  ssr: false,
  loading: () => (
    <div className="text-white text-center py-2 font-medium">Loading...</div>
  ),
});

enum SettingsTab {
  GENERAL = 'General',
  ODDS = 'Odds',
}

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
  const t = useTranslations('settings.general');
  const [activeTab, setActiveTab] = useState(SettingsTab.GENERAL);

  const [isOddsLoaded, setIsOddsLoaded] = useState(false);

  const tabs = useMemo(
    () => [
      { value: SettingsTab.GENERAL, label: t('general') },
      { value: SettingsTab.ODDS, label: t('odds') },
    ],
    [t],
  );

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: <GeneralSettings />,
      },
      {
        ...tabs[1],
        content: (
          <>
            {(activeTab === SettingsTab.ODDS || isOddsLoaded) && (
              <OddsSettings
                countries={participatingCountries}
                onLoaded={() => setIsOddsLoaded(true)}
              />
            )}
          </>
        ),
      },
    ],
    [activeTab, isOddsLoaded, participatingCountries, tabs],
  );

  useEffectOnce(onLoaded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,850px)]"
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
