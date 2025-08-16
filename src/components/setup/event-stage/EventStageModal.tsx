import React, { useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';

import { EventStage, StageVotingMode } from '../../../models';
import Modal from '../../common/Modal/Modal';
import ModalBottomContent from '../../common/Modal/ModalBottomContent';
import Tabs, { TabContent } from '../../common/tabs/Tabs';

import EventStageSettings from './EventStageSettings';
import EventStageVoters from './EventStageVoters';
import { useEventStageForm } from './hooks';

enum EventStageModalTab {
  SETTINGS = 'Settings',
  VOTERS = 'Voters',
}

const tabs = [
  { value: EventStageModalTab.SETTINGS, label: 'Settings' },
  { value: EventStageModalTab.VOTERS, label: 'Voters' },
];

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
  const isEditMode = !!eventStageToEdit;
  const [shouldClose, setShouldClose] = useState(false);
  const [activeTab, setActiveTab] = useState(EventStageModalTab.SETTINGS);

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
        alert('Please select at least one voting country');

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
        `Are you sure you want to delete ${eventStageToEdit.name}?`,
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
          content: <EventStageVoters stageId={eventStageToEdit?.id} />,
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
