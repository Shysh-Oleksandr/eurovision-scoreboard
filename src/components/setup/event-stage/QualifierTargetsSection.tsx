import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { QualifierTarget } from '../../../models';
import Button from '../../common/Button';
import { Input } from '../../Input';

import { MinusIcon } from '@/assets/icons/MinusIcon';
import { PlusIcon } from '@/assets/icons/PlusIcon';
import { TriangleAlertIcon } from '@/assets/icons/TriangleAlertIcon';
import { useCountriesStore } from '@/state/countriesStore';

const QualifierTargetsSection: React.FC<{ isEditMode: boolean }> = ({
  isEditMode,
}) => {
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

  // Get all stages sorted by order (including current stage if editing)
  const allStages = useMemo(() => {
    const stages = [...configuredEventStages];

    return stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [configuredEventStages]);

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

  // Calculate total qualifiers
  const totalQualifiers = useMemo(() => {
    return (qualifiesTo || []).reduce((sum, target) => sum + target.amount, 0);
  }, [qualifiesTo]);

  // Filter stages: only show stages with order > current stage order
  const availableStages = useMemo(() => {
    return allStages.filter((stage) => {
      return (
        !isEditMode ||
        qualifiesTo?.some(
          (q) => q.targetStageId === stage.id && q.amount > 0,
        ) ||
        (stage.order ?? 0) > currentOrder
      );
    });
  }, [allStages, currentOrder, isEditMode, qualifiesTo]);

  console.log('availableStages', availableStages);

  return (
    <>
      <div className="flex flex-col gap-3">
        <h4 className="middle-line text-white text-sm">
          {t('setup.eventStageModal.qualifierTargets')}
        </h4>

        {availableStages.length === 0 ? (
          <p className="text-white/70 text-sm">
            {t('setup.eventStageModal.noAvailableTargetStages')}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              {availableStages.map((stage) => {
                const amount = getQualifierAmount(stage.id);

                const isPrecedingStage = (stage.order ?? 0) < currentOrder;

                return (
                  <div
                    key={stage.id}
                    className="flex items-center gap-2 bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/10 px-3 py-1 rounded-md shadow-sm"
                  >
                    <div className="flex-1 text-white text-sm flex items-center gap-2">
                      {!!isPrecedingStage && (
                        <TriangleAlertIcon className="w-5 h-5 text-yellow-400" />
                      )}
                      {stage.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => decrementQualifier(stage.id)}
                        disabled={amount === 0}
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
                      />
                      <Button
                        onClick={() => incrementQualifier(stage.id)}
                        className="!px-3 h-[34px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Increase"
                        aria-label={`Increase qualifiers for ${stage.name}`}
                      >
                        <PlusIcon className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white font-medium">
                {t('setup.eventStageModal.numberOfQualifiers')}:
              </span>
              <span className="text-white/90 font-semibold bg-primary-800 px-3 py-1.5 shadow-sm rounded-md">
                {totalQualifiers}
              </span>
            </div>
          </>
        )}

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
