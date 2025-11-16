'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';

import { EventStage, StageVotingMode } from '../../../models';
import Modal from '../../common/Modal/Modal';
import ModalBottomContent from '../../common/Modal/ModalBottomContent';
import Tabs, { TabContent } from '../../common/tabs/Tabs';

import EventStageSettings from './EventStageSettings';
import { useEventStageForm } from './hooks';

const EventStageVoters = dynamic(() => import('./EventStageVoters'), {
  ssr: false,
  loading: () => (
    <div className="text-white text-center py-2 font-medium">Loading...</div>
  ),
});

enum EventStageModalTab {
  SETTINGS = 'Settings',
  VOTERS = 'Voters',
}

interface EventStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    stage: Omit<EventStage, 'countries' | 'isOver' | 'isJuryVoting'>,
  ) => void;
  onDelete: (stageId: string) => void;
  eventStageToEdit?: EventStage;
  localEventStagesLength: number;
}

const EventStageModal: React.FC<EventStageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  eventStageToEdit,
  localEventStagesLength,
}) => {
  const t = useTranslations('setup.eventStageModal');
  const isEditMode = !!eventStageToEdit;
  const [shouldClose, setShouldClose] = useState(false);
  const [activeTab, setActiveTab] = useState(EventStageModalTab.SETTINGS);

  const [isVotersLoaded, setIsVotersLoaded] = useState(false);

  const tabs = useMemo(
    () => [
      { value: EventStageModalTab.SETTINGS, label: t('settings') },
      { value: EventStageModalTab.VOTERS, label: t('voters') },
    ],
    [t],
  );

  const {
    form,
    onSubmit,
    isEditMode: isEditModeFromHook,
    isGrandFinalStage,
  } = useEventStageForm({
    eventStageToEdit,
    localEventStagesLength,
    isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setShouldClose(false);
      setActiveTab(EventStageModalTab.SETTINGS);
    }
  }, [isOpen]);

  const handleTriggerClose = () => {
    setShouldClose(true);
  };

  const handleSave = () => {
    form.handleSubmit((data) => {
      const result = onSubmit(data);

      if (result.votingCountries.length === 0 && eventStageToEdit) {
        toast(t('pleaseSelectAtLeastOneVotingCountry'), {
          type: 'error',
        });

        return;
      }

      if (result) {
        // Ensure we keep full country objects (not just {code, name}) on save
        onSave({
          ...result,
          votingMode: result.votingMode as StageVotingMode,
          votingCountries: (result.votingCountries || []) as any,
        });
        handleTriggerClose();
      }
    })();
  };

  const handleDelete = () => {
    if (!eventStageToEdit) return;

    if (
      window.confirm(
        t('areYouSureYouWantToDelete', { name: eventStageToEdit.name }),
      )
    ) {
      onDelete(eventStageToEdit.id);
      handleTriggerClose();
    }
  };

  const renderContent = () => {
    if (isEditMode) {
      // Edit mode - use TabContent for state preservation
      const tabsWithContent = [
        {
          ...tabs[0],
          content: (
            <EventStageSettings
              eventStageToEdit={eventStageToEdit}
              isEditMode={isEditModeFromHook}
              isGrandFinalStage={isGrandFinalStage}
            />
          ),
        },
        {
          ...tabs[1],
          content: (
            <>
              {(activeTab === EventStageModalTab.VOTERS || isVotersLoaded) && (
                <EventStageVoters
                  stageId={eventStageToEdit?.id}
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
    }

    // Add mode - show only settings
    return (
      <EventStageSettings
        eventStageToEdit={eventStageToEdit}
        isEditMode={isEditModeFromHook}
        isGrandFinalStage={isGrandFinalStage}
      />
    );
  };

  return (
    <Modal
      isOpen={isOpen && !shouldClose}
      onClose={handleTriggerClose}
      onClosed={onClose}
      overlayClassName="!z-[1001]"
      containerClassName={`${
        isEditMode ? '!w-[min(100%,800px)]' : '!w-[min(100%,500px)]'
      }`}
      contentClassName={`${isEditMode ? 'h-[60vh] narrow-scrollbar' : ''}`}
      topContent={
        isEditMode ? (
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={(tab) => setActiveTab(tab as EventStageModalTab)}
            containerClassName="!rounded-none"
          />
        ) : null
      }
      bottomContent={
        <ModalBottomContent
          onClose={handleTriggerClose}
          onSave={handleSave}
          onDelete={
            isGrandFinalStage || !eventStageToEdit ? undefined : handleDelete
          }
        />
      }
    >
      <FormProvider {...(form as any)}>{renderContent()}</FormProvider>
    </Modal>
  );
};

export default EventStageModal;
