'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { FormProvider } from 'react-hook-form';

import { EventStage } from '../../../models';
import Modal from '../../common/Modal/Modal';
import ModalBottomContent from '../../common/Modal/ModalBottomContent';

import EventStageSettings from './EventStageSettings';
import { useEventStageForm } from './hooks/useEventStageForm';

interface EventStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    stage: Omit<EventStage, 'countries' | 'isOver' | 'isJuryVoting'>,
    eventsOrder: string[],
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

  const {
    form,
    onSubmit,
    isEditMode: isEditModeFromHook,
    isLastStage,
  } = useEventStageForm({
    eventStageToEdit,
    localEventStagesLength,
    isOpen,
  });

  const handleTriggerClose = () => {
    setShouldClose(true);
  };

  const handleSave = () => {
    form.handleSubmit((data) => {
      const result = onSubmit(data);

      handleTriggerClose();

      setTimeout(
        () => {
          if (result) {
            onSave(result, data.eventsOrder);
          }
          // Prevent displaying the new stage in the list before the modal is closed
        },
        isEditMode ? 0 : 200,
      );
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

  return (
    <Modal
      isOpen={isOpen && !shouldClose}
      onClose={handleTriggerClose}
      onClosed={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      bottomContent={
        <ModalBottomContent
          onClose={handleTriggerClose}
          onSave={handleSave}
          onDelete={!eventStageToEdit || isLastStage ? undefined : handleDelete}
        />
      }
    >
      <FormProvider {...(form as any)}>
        <EventStageSettings
          isEditMode={isEditModeFromHook}
          isLastStage={isLastStage}
          eventStageToEdit={eventStageToEdit}
        />
      </FormProvider>
    </Modal>
  );
};

export default EventStageModal;
