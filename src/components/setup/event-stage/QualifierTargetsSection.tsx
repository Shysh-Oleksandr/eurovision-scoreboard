import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import SortableList from 'react-easy-sort';
import { useFormContext } from 'react-hook-form';

import { EventStage, QualifierTarget } from '../../../models';
import Button from '../../common/Button';
import { CustomSortableItem } from '../../common/CustomSortableItem';
import { Input } from '../../Input';

import { MinusIcon } from '@/assets/icons/MinusIcon';
import { PlusIcon } from '@/assets/icons/PlusIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import { useCountriesStore } from '@/state/countriesStore';

const QualifierTargetsSection: React.FC<{
  isEditMode: boolean;
  eventStageToEdit?: EventStage;
}> = ({ isEditMode, eventStageToEdit }) => {
  const t = useTranslations();
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const qualifiesTo = watch('qualifiesTo') as QualifierTarget[] | undefined;
  const currentOrder = watch('order') as number;
  const currentName = watch('name') as string;
  const currentId = watch('id') as string;

  // Local state for visual ordering of stages
  const [visualStages, setVisualStages] = useState<EventStage[]>([]);

  // Create current stage object (for both editing and creating)
  const currentStage = useMemo(() => {
    if (isEditMode && eventStageToEdit) {
      return eventStageToEdit;
    }

    // For creating new stage, create temporary object based on form values
    return {
      id: currentId,
      name: currentName || `Stage ${configuredEventStages.length + 1}`,
      order: currentOrder,
      votingMode: watch('votingMode') as any,
      qualifiesTo: qualifiesTo || [],
      countries: [],
      votingCountries: [],
      isOver: false,
      isJuryVoting: false,
      isLastStage: false,
    } as EventStage;
  }, [
    isEditMode,
    eventStageToEdit,
    currentId,
    currentName,
    currentOrder,
    watch,
    qualifiesTo,
    configuredEventStages.length,
  ]);

  // Get all stages sorted by order (including current stage if editing)
  const allStages = useMemo(() => {
    const stages = [...configuredEventStages];

    return stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [configuredEventStages]);

  // Initialize visual stages when allStages or currentStage changes
  React.useEffect(() => {
    const stages = [...allStages];
    // Add current stage if it's not already in the list (for editing) or if it's a new stage
    const currentStageExists = stages.some(
      (stage) => stage.id === currentStage.id,
    );

    if (!currentStageExists) {
      stages.push(currentStage);
    }
    setVisualStages(stages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStages]);

  // Get qualifier amount for a specific stage

  const getQualifierAmount = (stageId: string): number => {
    const target = (qualifiesTo || []).find((q) => q.targetStageId === stageId);

    return target?.amount || 0;
  };

  // Update qualifier amount for a specific stage
  const updateQualifierAmount = (stageId: string, amount: number) => {
    const current = qualifiesTo || [];
    const existingIndex = current.findIndex((q) => q.targetStageId === stageId);

    let updated: QualifierTarget[];

    if (existingIndex >= 0) {
      updated = [...current];

      if (amount > 0) {
        updated[existingIndex] = { targetStageId: stageId, amount };
      } else {
        // Remove if amount is 0
        updated = updated.filter((_, i) => i !== existingIndex);
      }
    } else if (amount > 0) {
      updated = [...current, { targetStageId: stageId, amount }];
    } else {
      updated = current;
    }

    setValue('qualifiesTo', updated);
  };

  const incrementQualifier = (stageId: string) => {
    const currentAmount = getQualifierAmount(stageId);

    updateQualifierAmount(stageId, currentAmount + 1);
  };

  const decrementQualifier = (stageId: string) => {
    const currentAmount = getQualifierAmount(stageId);

    if (currentAmount > 0) {
      updateQualifierAmount(stageId, currentAmount - 1);
    }
  };

  const handleInputChange = (stageId: string, value: string) => {
    const numValue = parseInt(value) || 0;

    updateQualifierAmount(stageId, Math.max(0, numValue));
  };

  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    const draggedStage = sortableStages[oldIndex];

    // Don't allow reordering the Grand Final
    if (draggedStage?.id === grandFinalStage?.id) {
      return;
    }

    // Create new order for sortable stages
    const newSortableStages = [...sortableStages];

    const [movedStage] = newSortableStages.splice(oldIndex, 1);

    newSortableStages.splice(newIndex, 0, movedStage);

    // Reconstruct full visual stages with new order
    const newVisualStages = [...newSortableStages, grandFinalStage].filter(
      Boolean,
    );

    setValue(
      'eventsOrder',
      newVisualStages.map((stage) => stage.id),
    );

    // Update orders for all stages based on their new positions
    const finalVisualStages = newVisualStages.map((stage, index) => ({
      ...stage,
      order: index,
    }));

    // Update visual stages
    setVisualStages(finalVisualStages);

    // If the current stage was reordered, update its order in the form
    const currentStageIndex = finalVisualStages.findIndex(
      (stage) => stage.id === currentId,
    );

    if (currentStageIndex !== -1) {
      const newCurrentOrder = finalVisualStages[currentStageIndex].order;

      setValue('order', newCurrentOrder);

      // Reset qualifier targets that are now invalid (preceding stages)
      const currentQualifiesTo = qualifiesTo || [];
      const validQualifiesTo = currentQualifiesTo.filter((target) => {
        const targetStage = finalVisualStages.find(
          (stage) => stage.id === target.targetStageId,
        );

        return targetStage && (targetStage.order ?? 0) > newCurrentOrder;
      });

      if (validQualifiesTo.length !== currentQualifiesTo.length) {
        setValue('qualifiesTo', validQualifiesTo);
      }
    }
  };

  // Calculate total qualifiers
  const totalQualifiers = useMemo(() => {
    return (qualifiesTo || []).reduce((sum, target) => sum + target.amount, 0);
  }, [qualifiesTo]);

  // Separate Grand Final from sortable stages (like StageReorderModal)

  const { sortableStages, grandFinalStage } = useMemo(() => {
    const sorted = [...visualStages].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    const grandFinal = sorted[sorted.length - 1];
    const sortable = sorted.slice(0, -1);

    return { sortableStages: sortable, grandFinalStage: grandFinal };
  }, [visualStages]);

  useEffect(() => {
    setVisualStages((prev) =>
      prev.map((stage) =>
        stage.id === currentId ? { ...stage, name: currentName } : stage,
      ),
    );
  }, [currentName, currentId]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h4 className="middle-line text-white text-sm">
            {t('setup.eventStageModal.qualifierTargets')}
          </h4>

          <p className="text-white/70 text-sm">
            {t('setup.eventStageModal.qualifierTargetsDescription')}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <SortableList
            onSortEnd={handleSortEnd}
            className="flex flex-col gap-2"
            draggedItemClassName="dragged"
          >
            {sortableStages.map((stage) => {
              const amount = getQualifierAmount(stage.id);
              const isCurrentStage = stage.id === currentStage.id;
              const isPrecedingStage = (stage.order ?? 0) < currentOrder;

              return (
                <CustomSortableItem
                  key={stage.id}
                  id={stage.id}
                  className={`pl-1.5 pr-3 h-[42px] shadow-sm ${
                    isCurrentStage
                      ? ''
                      : 'bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/10'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 text-white text-sm flex items-center gap-2">
                      {stage.name}
                      {isCurrentStage && ` (${t('common.current')})`}
                    </div>

                    {!isCurrentStage && (
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => decrementQualifier(stage.id)}
                          disabled={amount === 0 || isPrecedingStage}
                          className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Decrease"
                          aria-label={`Decrease qualifiers for ${stage.name}`}
                        >
                          <MinusIcon className="w-5 h-5" />
                        </Button>
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) =>
                            handleInputChange(stage.id, e.target.value)
                          }
                          className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-20 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                          min={0}
                          placeholder="0"
                          disabled={isPrecedingStage}
                        />
                        <Button
                          onClick={() => incrementQualifier(stage.id)}
                          disabled={isPrecedingStage}
                          className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Increase"
                          aria-label={`Increase qualifiers for ${stage.name}`}
                        >
                          <PlusIcon className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CustomSortableItem>
              );
            })}
          </SortableList>

          {/* Grand Final - displayed separately, not sortable */}
          {grandFinalStage && (
            <div className="flex items-center gap-2 bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/10 px-3 py-1 rounded-md shadow-sm h-[42px]">
              <div className="flex-1 text-white text-sm flex items-center gap-2">
                {grandFinalStage.name}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => updateQualifierAmount(grandFinalStage.id, 0)}
                  disabled={getQualifierAmount(grandFinalStage.id) === 0}
                  className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear"
                  aria-label={`Clear qualifiers for ${grandFinalStage.name}`}
                >
                  <RestartIcon className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => decrementQualifier(grandFinalStage.id)}
                  disabled={
                    getQualifierAmount(grandFinalStage.id) === 0 ||
                    (grandFinalStage.order ?? 0) < currentOrder
                  }
                  className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Decrease"
                  aria-label={`Decrease qualifiers for ${grandFinalStage.name}`}
                >
                  <MinusIcon className="w-5 h-5" />
                </Button>
                <Input
                  type="number"
                  value={getQualifierAmount(grandFinalStage.id)}
                  onChange={(e) =>
                    handleInputChange(grandFinalStage.id, e.target.value)
                  }
                  className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-20 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  min={0}
                  placeholder="0"
                  disabled={(grandFinalStage.order ?? 0) < currentOrder}
                />
                <Button
                  onClick={() => incrementQualifier(grandFinalStage.id)}
                  disabled={(grandFinalStage.order ?? 0) < currentOrder}
                  className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Increase"
                  aria-label={`Increase qualifiers for ${grandFinalStage.name}`}
                >
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white font-medium">
            {t('setup.eventStageModal.numberOfQualifiers')}:
          </span>
          <span className="text-white/90 font-semibold bg-primary-800 px-3 py-1.5 shadow-sm rounded-md">
            {totalQualifiers}
          </span>
        </div>

        {errors.qualifiesTo && (
          <span className="text-red-400 text-sm">
            {errors.qualifiesTo.message as string}
          </span>
        )}
      </div>
    </>
  );
};

export default QualifierTargetsSection;
