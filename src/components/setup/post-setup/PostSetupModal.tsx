'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { toast } from 'react-toastify';

import Modal from '../../common/Modal/Modal';
import ModalBottomContent from '../../common/Modal/ModalBottomContent';
import Tabs, { TabContent } from '../../common/tabs/Tabs';

import EventStageVoters from './EventStageVoters';
import { usePostSetupStageForm } from './hooks/usePostSetupStageForm';
import { RunningOrderTab, useRunningOrder } from './running-order';

import ShareResultsModal from '@/components/simulation/share/ShareResultsModal';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { EventStage } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

enum PostSetupModalTab {
  RUNNING_ORDER = 'Running Order',
  VOTERS = 'Voters',
}

interface PostSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: EventStage;
  onLoaded?: () => void;
  onSave: () => void;
}

const PostSetupModal: React.FC<PostSetupModalProps> = ({
  isOpen,
  onClose,
  stage,
  onLoaded,
  onSave,
}) => {
  const t = useTranslations('setup.eventStageModal');
  const [activeTab, setActiveTab] = useState(PostSetupModalTab.RUNNING_ORDER);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [isVotersLoaded, setIsVotersLoaded] = useState(false);

  const [selectedLayout, setSelectedLayout] = useState<'list' | 'grid'>('grid');

  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const setConfiguredEventStages = useCountriesStore(
    (state) => state.setConfiguredEventStages,
  );
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);

  const configuredStage = useMemo(
    () => configuredEventStages.find((s) => s.id === stage.id),
    [configuredEventStages, stage.id],
  );

  const {
    orderedCodes,
    orderedCountries,
    handleRunningOrderSortEnd,
    handleQuickSort,
  } = useRunningOrder({
    isOpen,
    stageId: stage.id,
    stageCountries: stage.countries,
    savedRunningOrder: configuredStage?.runningOrder,
  });

  const form = usePostSetupStageForm({
    stage,
    isOpen,
  });

  const tabs = useMemo(
    () => [
      { value: PostSetupModalTab.RUNNING_ORDER, label: t('runningOrder') },
      { value: PostSetupModalTab.VOTERS, label: t('voters') },
    ],
    [t],
  );

  const handleSave = () => {
    form.handleSubmit((data) => {
      if (data.votingCountries.length === 0) {
        toast.error('Please add at least one voter');

        return;
      }

      onClose();

      setTimeout(() => {
        const runningOrder = orderedCodes;
        const updatedStages = configuredEventStages.map((s) =>
          s.id === stage.id
            ? {
                ...s,
                votingCountries: data.votingCountries,
                runningOrder,
              }
            : s,
        );
        const updatedEventStages = eventStages.map((s) =>
          s.id === stage.id
            ? {
                ...s,
                votingCountries: data.votingCountries,
                runningOrder,
              }
            : s,
        );

        setConfiguredEventStages(updatedStages);
        setEventStages(updatedEventStages);

        onSave();
      }, 300);
    })();
  };

  const shareTitleOverride = `${contestName} ${contestYear} - ${stage.name}`;
  const shareSubtitleOverride = t('runningOrder');

  const renderContent = () => {
    const tabsWithContent = [
      {
        ...tabs[0],
        content: (
          <RunningOrderTab
            stageId={stage.id}
            orderedCountries={orderedCountries}
            selectedLayout={selectedLayout}
            setSelectedLayout={setSelectedLayout}
            onSortEnd={handleRunningOrderSortEnd}
            onQuickSort={handleQuickSort}
            onShare={() => setIsShareModalOpen(true)}
          />
        ),
      },
      {
        ...tabs[1],
        content: (
          <>
            {(activeTab === PostSetupModalTab.VOTERS || isVotersLoaded) && (
              <EventStageVoters
                stage={stage}
                onLoaded={() => setIsVotersLoaded(true)}
              />
            )}
          </>
        ),
      },
    ];

    return (
      <TabContent
        tabs={tabsWithContent}
        activeTab={activeTab}
        preserveContent
      />
    );
  };

  useEffectOnce(onLoaded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClose}
      overlayClassName="!z-[1002]"
      containerClassName="!w-[min(100%,800px)]"
      contentClassName="h-[70vh] narrow-scrollbar !pt-2"
      topContent={
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as PostSetupModalTab)}
          containerClassName="!rounded-none"
        />
      }
      bottomContent={
        <ModalBottomContent onClose={onClose} onSave={handleSave} />
      }
    >
      <h3 className="text-xl font-semibold text-white middle-line after:bg-primary-800 before:bg-primary-800">
        {stage.name}
      </h3>
      <FormProvider {...(form as any)}>{renderContent()}</FormProvider>
      <ShareResultsModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onLoaded={() => {}}
        countriesOverride={orderedCountries}
        titleOverride={shareTitleOverride}
        subtitleOverride={shareSubtitleOverride}
      />
    </Modal>
  );
};

export default PostSetupModal;
