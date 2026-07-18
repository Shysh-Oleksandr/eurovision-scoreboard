'use client';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '../common/tabs/Tabs';

import { GeneralSettings } from './GeneralSettings';
import { useGlobalOddsController } from './useGlobalOddsController';

import { useEffectOnce } from '@/hooks/useEffectOnce';
import { BaseCountry } from '@/models';

const OddsSettings = dynamic(() => import('./OddsSettings'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-2">
      <span className="loader" />
    </div>
  ),
});

const RelationsSettings = dynamic(() => import('./RelationsSettings'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-2">
      <span className="loader" />
    </div>
  ),
});

enum SettingsTab {
  GENERAL = 'General',
  ODDS = 'Odds',
  RELATIONS = 'Relations',
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
  const [isRelationsLoaded, setIsRelationsLoaded] = useState(false);

  const oddsController = useGlobalOddsController();

  const tabs = useMemo(
    () => [
      { value: SettingsTab.GENERAL, label: t('general') },
      { value: SettingsTab.ODDS, label: t('odds') },
      { value: SettingsTab.RELATIONS, label: t('relations') },
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
                controller={oddsController}
                countries={participatingCountries}
                onLoaded={() => setIsOddsLoaded(true)}
              />
            )}
          </>
        ),
      },
      {
        ...tabs[2],
        content: (
          <>
            {(activeTab === SettingsTab.RELATIONS || isRelationsLoaded) && (
              <RelationsSettings onLoaded={() => setIsRelationsLoaded(true)} />
            )}
          </>
        ),
      },
    ],
    [
      activeTab,
      isOddsLoaded,
      isRelationsLoaded,
      oddsController,
      participatingCountries,
      tabs,
    ],
  );

  useEffectOnce(onLoaded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,900px)] !max-w-[900px]"
      contentClassName="!py-0 !px-2 text-white h-[70vh] narrow-scrollbar overscroll-none"
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
