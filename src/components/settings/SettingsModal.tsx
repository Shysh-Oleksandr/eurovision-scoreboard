'use client';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import Modal from '../common/Modal/Modal';
import SegmentedTabs from '../common/SegmentedTabs';

import { GeneralSettings } from './GeneralSettings';
import { useGlobalOddsController } from './useGlobalOddsController';

import { useEffectOnce } from '@/hooks/useEffectOnce';
import { BaseCountry } from '@/models';
import { SettingsModalTab, useGeneralStore } from '@/state/generalStore';

const TabLoader = () => (
  <div className="text-center py-6">
    <span className="loader" />
  </div>
);

const OddsSettings = dynamic(() => import('./OddsSettings'), {
  ssr: false,
  loading: TabLoader,
});

const RelationsSettings = dynamic(() => import('./RelationsSettings'), {
  ssr: false,
  loading: TabLoader,
});

enum SettingsTab {
  GENERAL = 'General',
  ODDS = 'Odds',
  RELATIONS = 'Relations',
}

const SETTINGS_TABS = Object.values(SettingsTab);

const resolveSettingsTab = (tab: string | undefined): SettingsTab =>
  tab && (SETTINGS_TABS as string[]).includes(tab)
    ? (tab as SettingsTab)
    : SettingsTab.GENERAL;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participatingCountries: BaseCountry[];
  onLoaded: () => void;
}

/**
 * Settings in the libraries' frame: the title with General / Odds /
 * Relations beside it and × in the header; on phones the three tabs move to
 * a bar under the thumb. Each tab scrolls on its own, mounts on its first
 * visit and then stays (the last one is remembered).
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  participatingCountries,
  onLoaded,
}) => {
  const t = useTranslations();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const lastOpenedSettingsTab = useGeneralStore(
    (state) => state.settings.lastOpenedSettingsTab,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);
  const activeTab = resolveSettingsTab(lastOpenedSettingsTab);
  const [visited, setVisited] = useState<SettingsTab[]>([activeTab]);

  if (!visited.includes(activeTab)) setVisited([...visited, activeTab]);

  const setActiveTab = (tab: SettingsTab) => {
    setSettings({ lastOpenedSettingsTab: tab as SettingsModalTab });
  };

  const oddsController = useGlobalOddsController();

  const tabs = useMemo(
    () => [
      { value: SettingsTab.GENERAL, label: t('settings.general.general') },
      { value: SettingsTab.ODDS, label: t('settings.general.odds') },
      { value: SettingsTab.RELATIONS, label: t('settings.general.relations') },
    ],
    [t],
  );

  const tabId = (tab: SettingsTab) => `${baseId}-tab-${tab}`;
  const panelId = (tab: SettingsTab) => `${baseId}-panel-${tab}`;

  useEffectOnce(onLoaded);

  const renderTab = (tab: SettingsTab) => {
    switch (tab) {
      case SettingsTab.ODDS:
        return (
          <div className="px-3.5 pb-5 2cols:px-5">
            <OddsSettings
              controller={oddsController}
              countries={participatingCountries}
            />
          </div>
        );
      case SettingsTab.RELATIONS:
        return (
          <div className="px-2">
            <div className="py-4 px-2">
              <RelationsSettings />
            </div>
          </div>
        );
      default:
        return (
          <div className="px-2">
            <div className="py-4 px-2">
              <GeneralSettings />
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      unstyledSurface
      fullScreenOnPhone
      ariaLabelledBy={titleId}
      containerClassName="dp-flat dp-settings-surface 2cols:!w-[min(100%,900px)] 2cols:!max-w-[900px] 2cols:!rounded-2xl"
      contentClassName="!p-0 !overflow-hidden flex flex-col text-white 2cols:!h-[calc(100dvh-170px)] 2cols:!max-h-[740px] 2cols:!min-h-[440px]"
      overlayClassName="!z-[1001]"
      topContent={
        <div className="dp-settings-head flex h-[56px] flex-none items-center gap-4 pl-4 pr-1.5 2cols:h-[66px] 2cols:pl-[22px] 2cols:pr-3">
          <h2
            id={titleId}
            className="min-w-0 truncate text-[19px] font-extrabold tracking-[-0.024em] 2cols:text-[20px]"
          >
            {t('common.settings')}
          </h2>
          <SegmentedTabs
            className="hidden 2cols:flex"
            tabs={tabs}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabelledBy={titleId}
            tabId={tabId}
            panelId={panelId}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="ml-auto grid size-11 flex-none place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-[22px]" aria-hidden="true" />
          </button>
        </div>
      }
      bottomContent={
        <div className="dp-settings-foot flex-none px-3 pb-[calc(10px+var(--modal-safe-bottom,0px))] pt-2.5 2cols:hidden">
          <SegmentedTabs
            className="flex"
            tabs={tabs}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabelledBy={titleId}
            large
          />
        </div>
      }
    >
      {SETTINGS_TABS.map((tab) => (
        <div
          key={tab}
          id={panelId(tab)}
          role="tabpanel"
          aria-labelledby={tabId(tab)}
          hidden={tab !== activeTab}
          className={
            tab === activeTab
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-none narrow-scrollbar'
              : undefined
          }
        >
          {visited.includes(tab) && renderTab(tab)}
        </div>
      ))}
    </Modal>
  );
};

export default SettingsModal;
