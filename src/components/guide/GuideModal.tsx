import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { CollapsibleSection } from '../common/CollapsibleSection';
import Modal from '../common/Modal/Modal';
import ModalBottomCloseButton from '../common/Modal/ModalBottomCloseButton';
import { GUIDE_RICH_TEXT_COMPONENTS } from '../common/RichText';
import Tabs from '../common/tabs/Tabs';

const TAB_SECTIONS: Record<string, string[]> = {
  start: ['gettingStarted', 'signIn', 'savingContests', 'customEntries'],
  setup: [
    'yearData',
    'countryAssignment',
    'grandFinalOnly',
    'customStages',
    'votingModes',
    'votingCountries',
    'runningOrder',
  ],
  voting: [
    'customPointsSystem',
    'predefinedVoting',
    'oddsRandomness',
    'presentationMode',
    'pickQualifiers',
    'moreOptions',
  ],
  themes: [
    'yearThemes',
    'browseThemes',
    'customThemeBuilder',
    'soundEffects',
    'visualDetails',
  ],
  more: [
    'finalStats',
    'splitStats',
    'shareScoreboard',
    'shareStats',
    'leaderboard',
    'myStats',
    'communityFollowing',
    'uiPreferences',
    'confirmations',
    'language',
    'feedback',
  ],
};

const GuideModal = ({
  showModal,
  setShowModal,
  onLoaded,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onLoaded: () => void;
}) => {
  const t = useTranslations('guide');
  const [activeTab, setActiveTab] = useState('start');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (key: string) => {
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 400);
  };

  useEffect(() => {
    onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { label: t('tabs.start'), value: 'start' },
    { label: t('tabs.setup'), value: 'setup' },
    { label: t('tabs.voting'), value: 'voting' },
    { label: t('tabs.themes'), value: 'themes' },
    { label: t('tabs.more'), value: 'more' },
  ];

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      containerClassName="!w-[min(100%,700px)]"
      contentClassName="pb-2 xs:!pt-5 !pt-4 sm:!px-8 xs:!px-6 !px-4 text-white sm:h-[55vh] h-[60vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      withBlur
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          containerClassName="!rounded-none"
        />
      }
      bottomContent={
        <ModalBottomCloseButton onClose={() => setShowModal(false)} />
      }
    >
      <div className="flex flex-col gap-3">
        {TAB_SECTIONS[activeTab]?.map((key) => (
          <CollapsibleSection
            key={key}
            ref={(element) => {
              sectionRefs.current[key] = element;
            }}
            defaultExpanded={activeTab === 'start' && key === 'gettingStarted'}
            onExpand={() => scrollToSection(key)}
            title={t(`${activeTab}.${key}.title` as Parameters<typeof t>[0])}
          >
            <div className="text-sm sm:text-base text-white/90 leading-relaxed">
              {t.rich(
                `${activeTab}.${key}.content` as Parameters<typeof t>[0],
                GUIDE_RICH_TEXT_COMPONENTS,
              )}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </Modal>
  );
};

export default GuideModal;
