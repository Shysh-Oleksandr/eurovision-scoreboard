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
import { ToggleButton } from '@/components/common/ToggleButton';
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

  // Mode toggle for rank-based qualification
  const [isRankBasedMode, setIsRankBasedMode] = useState(false);

  // Detect initial mode based on existing data
  useEffect(() => {
    const hasRankBasedQualifiers = (qualifiesTo || []).some(
      (target) => target.minRank || target.maxRank,
    );

    setIsRankBasedMode(hasRankBasedQualifiers);
  }, [qualifiesTo]);

  // Convert between amount-based and rank-based qualification
  const convertToRankBased = () => {
    const currentQualifiesTo = qualifiesTo || [];
    const totalQualifiers = currentQualifiesTo.reduce(
      (sum, target) => sum + target.amount,
      0,
    );

    if (totalQualifiers === 0) {
      setValue('qualifiesTo', []);

      return;
    }

    // Get the total number of participants in the current stage
    const currentStage = allStages.find((s) => s.id === currentId);
    const totalParticipants = currentStage?.countries.length || totalQualifiers;

    // Convert amounts to rank ranges
    const targetStagesInOrder = currentQualifiesTo
      .map((target) => allStages.find((s) => s.id === target.targetStageId))
      .sort((a, b) => (b?.order ?? 0) - (a?.order ?? 0))
      .filter(Boolean) as EventStage[];

    let currentRank = 1;
    const newQualifiesTo = targetStagesInOrder.map((stage) => {
      const target = currentQualifiesTo.find(
        (q) => q.targetStageId === stage.id,
      )!;

      const minRank = currentRank;
      const maxRank = Math.min(
        currentRank + target.amount - 1,
        totalParticipants,
      );

      currentRank = maxRank + 1;

      return {
        targetStageId: stage.id,
        amount: target.amount, // Keep amount for backward compatibility
        minRank,
        maxRank,
      };
    });

    setValue('qualifiesTo', newQualifiesTo);
  };

  const convertToAmountBased = () => {
    const currentQualifiesTo = qualifiesTo || [];
    const newQualifiesTo = currentQualifiesTo.map((target) => {
      // If rank-based, calculate amount from range
      if (target.minRank && target.maxRank) {
        return {
          targetStageId: target.targetStageId,
          amount: target.maxRank - target.minRank + 1,
        };
      }

      // Otherwise keep the existing amount
      return {
        targetStageId: target.targetStageId,
        amount: target.amount,
      };
    });

    setValue('qualifiesTo', newQualifiesTo);
  };

  const handleModeToggle = (newMode: boolean) => {
    if (newMode) {
      // Switching to rank-based mode
      convertToRankBased();
    } else {
      // Switching to amount-based mode
      convertToAmountBased();
    }
    setIsRankBasedMode(newMode);
  };

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

  // Get qualifier min rank for a specific stage
  const getQualifierMinRank = (stageId: string): number | undefined => {
    const target = (qualifiesTo || []).find((q) => q.targetStageId === stageId);

    return target?.minRank;
  };

  // Get qualifier max rank for a specific stage
  const getQualifierMaxRank = (stageId: string): number | undefined => {
    const target = (qualifiesTo || []).find((q) => q.targetStageId === stageId);

    return target?.maxRank;
  };

  // Update qualifier amount for a specific stage
  const updateQualifierAmount = (stageId: string, amount: number) => {
    const current = qualifiesTo || [];
    const existingIndex = current.findIndex((q) => q.targetStageId === stageId);

    let updated: QualifierTarget[];

    if (existingIndex >= 0) {
      updated = [...current];
      if (amount > 0) {
        const existing = updated[existingIndex];

        updated[existingIndex] = {
          targetStageId: stageId,
          amount,
          // Keep existing rank data if in rank mode, otherwise clear it
          ...(isRankBasedMode
            ? { minRank: existing.minRank, maxRank: existing.maxRank }
            : {}),
        };
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

  // Update rank range for a specific stage
  const updateQualifierRange = (
    stageId: string,
    minRank?: number,
    maxRank?: number,
  ) => {
    const current = qualifiesTo || [];
    const existingIndex = current.findIndex((q) => q.targetStageId === stageId);

    let updated: QualifierTarget[];

    if (existingIndex >= 0) {
      updated = [...current];
      const existing = updated[existingIndex];

      updated[existingIndex] = {
        ...existing,
        minRank,
        maxRank,
      };
    } else {
      // This shouldn't happen in rank mode, but handle it gracefully
      updated = [
        ...current,
        {
          targetStageId: stageId,
          amount: 0, // Will be calculated from range
          minRank,
          maxRank,
        },
      ];
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
    if (isRankBasedMode) {
      // In rank-based mode, calculate based on ranges
      const ranges = (qualifiesTo || []).map((target) => {
        if (target.minRank && target.maxRank) {
          return target.maxRank - target.minRank + 1;
        }

        return 0;
      });

      return ranges.reduce((sum, range) => sum + range, 0);
    }

    // In amount-based mode, use the amounts directly
    return (qualifiesTo || []).reduce((sum, target) => sum + target.amount, 0);
  }, [qualifiesTo, isRankBasedMode]);

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
          <div className="flex items-center justify-between border-t border-white/40 border-solid pt-2">
            <h4 className="text-white text-sm">
              {t('setup.eventStageModal.qualifierTargets')}
            </h4>
            <div className="flex items-center gap-2">
              <label className="text-white/70 text-xs">
                {t('setup.eventStageModal.rankBasedQualification')}
              </label>
              <ToggleButton
                isActive={isRankBasedMode}
                onToggle={() => handleModeToggle(!isRankBasedMode)}
              />
            </div>
          </div>

          <p className="text-white/70 text-sm">
            {isRankBasedMode
              ? t('setup.eventStageModal.qualifierTargetsDescriptionRankBased')
              : t('setup.eventStageModal.qualifierTargetsDescription')}
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
                  className={`pl-1.5 pr-3 min-h-[42px] shadow-sm ${
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
                        {isRankBasedMode ? (
                          // Rank-based mode: show reset button, min-max range inputs
                          <>
                            <Button
                              onClick={() =>
                                updateQualifierRange(
                                  stage.id,
                                  undefined,
                                  undefined,
                                )
                              }
                              disabled={
                                !getQualifierMinRank(stage.id) &&
                                !getQualifierMaxRank(stage.id)
                              }
                              className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Clear"
                              aria-label={`Clear qualifiers for ${stage.name}`}
                            >
                              <RestartIcon className="w-5 h-5" />
                            </Button>
                            <Input
                              type="number"
                              value={getQualifierMinRank(stage.id) || ''}
                              onChange={(e) => {
                                const minRank =
                                  parseInt(e.target.value) || undefined;
                                const maxRank = getQualifierMaxRank(stage.id);

                                updateQualifierRange(
                                  stage.id,
                                  minRank,
                                  maxRank,
                                );
                              }}
                              className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-16 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                              min={1}
                              placeholder="Min"
                              disabled={isPrecedingStage}
                              title="Minimum rank"
                            />
                            <MinusIcon className="w-4 h-4 text-white/70" />
                            <Input
                              type="number"
                              value={getQualifierMaxRank(stage.id) || ''}
                              onChange={(e) => {
                                const minRank = getQualifierMinRank(stage.id);
                                const maxRank =
                                  parseInt(e.target.value) || undefined;

                                updateQualifierRange(
                                  stage.id,
                                  minRank,
                                  maxRank,
                                );
                              }}
                              className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-16 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                              min={1}
                              placeholder="Max"
                              disabled={isPrecedingStage}
                              title="Maximum rank"
                            />
                          </>
                        ) : (
                          // Amount-based mode: show reset button, +/- buttons and amount input
                          <>
                            <Button
                              onClick={() => updateQualifierAmount(stage.id, 0)}
                              disabled={amount === 0}
                              className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Clear"
                              aria-label={`Clear qualifiers for ${stage.name}`}
                            >
                              <RestartIcon className="w-5 h-5" />
                            </Button>
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
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CustomSortableItem>
              );
            })}
          </SortableList>

          {/* Grand Final - displayed separately, not sortable */}
          {grandFinalStage && (
            <div className="flex items-center gap-2 bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/10 px-3 py-1 rounded-md shadow-sm min-h-[42px]">
              <div className="flex-1 text-white text-sm flex items-center gap-2">
                {grandFinalStage.name}
              </div>
              <div className="flex items-center gap-1">
                {isRankBasedMode ? (
                  // Rank-based mode for Grand Final
                  <>
                    <Button
                      onClick={() =>
                        updateQualifierRange(
                          grandFinalStage.id,
                          undefined,
                          undefined,
                        )
                      }
                      disabled={
                        !getQualifierMinRank(grandFinalStage.id) &&
                        !getQualifierMaxRank(grandFinalStage.id)
                      }
                      className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Clear"
                      aria-label={`Clear qualifiers for ${grandFinalStage.name}`}
                    >
                      <RestartIcon className="w-5 h-5" />
                    </Button>
                    <Input
                      type="number"
                      value={getQualifierMinRank(grandFinalStage.id) || ''}
                      onChange={(e) => {
                        const minRank = parseInt(e.target.value) || undefined;
                        const maxRank = getQualifierMaxRank(grandFinalStage.id);

                        updateQualifierRange(
                          grandFinalStage.id,
                          minRank,
                          maxRank,
                        );
                      }}
                      className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-16 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      min={1}
                      placeholder="Min"
                      disabled={(grandFinalStage.order ?? 0) < currentOrder}
                      title="Minimum rank"
                    />
                    <MinusIcon className="w-4 h-4 text-white/70" />
                    <Input
                      type="number"
                      value={getQualifierMaxRank(grandFinalStage.id) || ''}
                      onChange={(e) => {
                        const minRank = getQualifierMinRank(grandFinalStage.id);
                        const maxRank = parseInt(e.target.value) || undefined;

                        updateQualifierRange(
                          grandFinalStage.id,
                          minRank,
                          maxRank,
                        );
                      }}
                      className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-16 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                      min={1}
                      placeholder="Max"
                      disabled={(grandFinalStage.order ?? 0) < currentOrder}
                      title="Maximum rank"
                    />
                  </>
                ) : (
                  // Amount-based mode for Grand Final
                  <>
                    <Button
                      onClick={() =>
                        updateQualifierAmount(grandFinalStage.id, 0)
                      }
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
                  </>
                )}
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
