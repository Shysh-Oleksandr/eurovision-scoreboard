'use client';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId, useState } from 'react';
import { FormProvider } from 'react-hook-form';

import { EventStage } from '../../../models';
import Button from '../../common/Button';
import Modal from '../../common/Modal/Modal';
import EntryActionBar from '../custom-entry/EntryActionBar';

import EventStageSettings from './EventStageSettings';
import {
  stageFormFingerprint,
  useEventStageForm,
} from './hooks/useEventStageForm';

import { useConfirmation } from '@/hooks/useConfirmation';

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
  const t = useTranslations();
  const isEditMode = !!eventStageToEdit;
  const [shouldClose, setShouldClose] = useState(false);
  const titleId = `${useId()}-title`;

  const { confirm } = useConfirmation();

  const {
    form,
    onSubmit,
    isEditMode: isEditModeFromHook,
    isLastStage,
    openedFingerprint,
  } = useEventStageForm({
    eventStageToEdit,
    localEventStagesLength,
    isOpen,
  });

  // Editing: Save waits for a change. Adding: the defaults are a stage.
  const values = form.watch();
  const hasChanges =
    !isEditMode ||
    openedFingerprint === null ||
    stageFormFingerprint(values) !== openedFingerprint;

  const handleTriggerClose = () => {
    setShouldClose(true);
  };

  const handleSave = () => {
    if (!hasChanges) return;

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

  // Enter in a field saves, like any form. The voting select keeps Enter
  // for itself.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    if (!(e.target instanceof HTMLInputElement)) return;

    e.preventDefault();
    handleSave();
  };

  const handleDelete = () => {
    if (!eventStageToEdit) return;

    confirm({
      key: 'delete-stage',
      type: 'danger',
      title: t('settings.confirmations.deleteItem', {
        name: eventStageToEdit.name,
      }),
      description: t('settings.confirmations.actionCannotBeUndone'),
      onConfirm: () => {
        onDelete(eventStageToEdit.id);
        handleTriggerClose();
      },
    });
  };

  const canDelete = !!eventStageToEdit && !isLastStage;

  return (
    <Modal
      isOpen={isOpen && !shouldClose}
      onClose={handleTriggerClose}
      onClosed={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white narrow-scrollbar dp-flat"
      ariaLabelledBy={titleId}
      fullScreenOnPhone
      withBlur
      bottomContent={
        <EntryActionBar
          leading={
            canDelete ? (
              <Button
                variant="surface"
                size="lg"
                className="dp-act--quiet dp-act--danger -ml-2.5"
                Icon={<Trash2 className="size-[18px]" />}
                onClick={handleDelete}
                aria-label={t('setup.eventStageModal.deleteStage')}
              >
                <span className="dp-entry-bar-label">
                  {t('setup.eventStageModal.deleteStage')}
                </span>
              </Button>
            ) : undefined
          }
          onCancel={handleTriggerClose}
          onSave={handleSave}
          isSaving={false}
          saveDisabled={!hasChanges}
        />
      }
    >
      <FormProvider {...(form as any)}>
        <div onKeyDown={onFormKeyDown}>
          <EventStageSettings
            isEditMode={isEditModeFromHook}
            isLastStage={isLastStage}
            eventStageToEdit={eventStageToEdit}
            titleId={titleId}
          />
        </div>
      </FormProvider>
    </Modal>
  );
};

export default EventStageModal;
