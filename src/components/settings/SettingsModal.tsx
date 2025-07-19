import React, { useState } from 'react';

import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import Tabs from '../common/Tabs';

import { GeneralSettings } from './GeneralSettings';
import { OddsSettings } from './OddsSettings';

import { BaseCountry } from '@/models';

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
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  participatingCountries,
}) => {
  const [activeTab, setActiveTab] = useState(SettingsTab.GENERAL);

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
          buttonClassName="sm:h-14 h-10"
          overlayClassName="sm:h-14 h-10"
        />
      }
      bottomContent={
        <div className="bg-primary-900 p-4 z-30">
          <Button className="md:text-base text-sm w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="py-4 px-2">
        {activeTab === SettingsTab.GENERAL && <GeneralSettings />}
        {activeTab === SettingsTab.ODDS && (
          <OddsSettings countries={participatingCountries} />
        )}
      </div>
    </Modal>
  );
};

export default SettingsModal;
