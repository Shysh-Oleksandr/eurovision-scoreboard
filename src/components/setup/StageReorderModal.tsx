import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import SortableList from 'react-easy-sort';

import { EventStage } from '../../models';
import Button from '../common/Button';
import { CustomSortableItem } from '../common/CustomSortableItem';
import Modal from '../common/Modal/Modal';

import { useConfirmation } from '@/hooks/useConfirmation';

interface StageReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: EventStage[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onDelete: (stageId: string) => void;
}

const StageReorderModal: React.FC<StageReorderModalProps> = ({
  isOpen,
  onClose,
  stages,
  onReorder,
  onDelete,
}) => {
  const t = useTranslations();

  const { confirm } = useConfirmation();

  // Sort stages by order
  const { lastStage, sortedStages } = useMemo(() => {
    const _sortedStages = [...stages].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const lastStage = _sortedStages[_sortedStages.length - 1];
    const sortedStages = _sortedStages.slice(0, -1);

    return { lastStage, sortedStages };
  }, [stages]);

  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    // Don't allow reordering if dragging the last stage
    const draggedStage = sortedStages[oldIndex];

    if (draggedStage.id === lastStage?.id) {
      return;
    }

    // Don't allow dropping on the last stage
    if (sortedStages[newIndex].id === lastStage?.id) {
      return;
    }

    onReorder(oldIndex, newIndex);
  };

  const handleDeleteClick = (stageId: string) => {
    confirm({
      key: 'delete-stage',
      type: 'danger',
      title: t('settings.confirmations.deleteItem', {
        name: sortedStages.find((s) => s.id === stageId)?.name || '',
      }),
      description: t('settings.confirmations.actionCannotBeUndone'),
      onConfirm: () => {
        onDelete(stageId);
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white"
      overlayClassName="!z-[1001]"
      bottomContent={
        <div className="flex justify-end gap-2 bg-primary-900 p-4">
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white">
            {t('setup.eventSetupModal.reorderStages')}
          </h2>
          <p className="text-white/60 text-sm">
            {t('setup.eventStageModal.dragAndDropToReorder')}
          </p>
        </div>
        <SortableList
          onSortEnd={handleSortEnd}
          className="flex flex-col gap-2"
          draggedItemClassName="dragged"
        >
          {sortedStages.map((stage, index) => {
            const isLastStage = stage.id === lastStage?.id;
            const isDisabled = isLastStage;

            return (
              <CustomSortableItem
                key={stage.id}
                id={stage.id}
                onRemove={() => handleDeleteClick(stage.id)}
                disabled={isDisabled}
                className="px-2"
              >
                <div
                  className={`flex items-center gap-1 min-w-[29px] py-2 px-1 flex-1 ${
                    isDisabled ? ' cursor-not-allowed' : ''
                  }`}
                >
                  <span className="text-white/70 font-medium">
                    {index + 1}.
                  </span>
                  <span className="text-white flex-1">{stage.name}</span>
                </div>
              </CustomSortableItem>
            );
          })}
        </SortableList>
        {lastStage && (
          <div
            className="bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800
        to-primary-700/60 py-3 pr-2 pl-9 rounded-md"
          >
            {sortedStages.length + 1}. {lastStage?.name}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StageReorderModal;
