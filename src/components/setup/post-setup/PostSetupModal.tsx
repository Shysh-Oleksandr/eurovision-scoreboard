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

import { useEffectOnce } from '@/hooks/useEffectOnce';
import { EventStage } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
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
  const [activeTab, setActiveTab] = useState(PostSetupModalTab.VOTERS);

  const [isVotersLoaded, setIsVotersLoaded] = useState(false);

  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const setConfiguredEventStages = useCountriesStore(
    (state) => state.setConfiguredEventStages,
  );
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const setEventStages = useScoreboardStore((state) => state.setEventStages);

  const form = usePostSetupStageForm({
    stage,
    isOpen,
  });

  const tabs = useMemo(
    () => [
      // { value: PostSetupModalTab.RUNNING_ORDER, label: t('runningOrder') },
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
        const updatedStages = configuredEventStages.map((s) =>
          s.id === stage.id
            ? { ...s, votingCountries: data.votingCountries }
            : s,
        );
        const updatedEventStages = eventStages.map((s) =>
          s.id === stage.id
            ? { ...s, votingCountries: data.votingCountries }
            : s,
        );

        setConfiguredEventStages(updatedStages);
        setEventStages(updatedEventStages);

        onSave();
      }, 300);
    })();
  };

  const renderContent = () => {
    const tabsWithContent = [
      // {
      //   ...tabs[0],
      //   content: (
      //     <EventStageSettings
      //       isEditMode={isEditModeFromHook}
      //       isLastStage={isLastStage}
      //     />
      //   ),
      // },
      {
        ...tabs[0],
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
    </Modal>
  );
};

export default PostSetupModal;
