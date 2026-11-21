/* eslint-disable eqeqeq */
import { Minus, Plus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import {
  formatPlaceRange,
  type PlaceProblem,
  summarizePlaces,
} from './qualifierPlaces';

import { DragGripIcon } from '@/assets/icons/DragGripIcon';
import {
  SortableItem,
  SortableKnob,
  SortableList,
} from '@/components/common/sort/SortableList';
import { Segmented } from '@/components/simulation/columnLayout/controls';
import { languageTag } from '@/i18n/catalog';
import { EventStage, QualifierTarget } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

type QualifyMode = 'count' | 'places';

/** What a stage move took away, to put back with Undo. */
interface RemovedByMove {
  stageNames: string[];
  visualStages: EventStage[];
  order: number;
  eventsOrder: string[];
  qualifiesTo: QualifierTarget[];
}

/** Digits only: the fields hold place numbers and counts. */
const digits = (value: string) => value.replace(/\D/g, '').slice(0, 3);

/**
 * "Who goes through": for every later stage, how many entries of this stage
 * go there, or which of its places. The rows are also the stage order:
 * dragging one changes when the stages run.
 */
const QualifierTargetsSection: React.FC<{
  isEditMode: boolean;
  eventStageToEdit?: EventStage;
}> = ({ isEditMode, eventStageToEdit }) => {
  const t = useTranslations('setup.eventStageModal');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const ids = useId();
  const {
    watch,
    setValue,
    formState: { errors, submitCount },
  } = useFormContext();

  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const qualifiesTo = watch('qualifiesTo') as QualifierTarget[] | undefined;
  const currentOrder = watch('order') as number;
  const currentName = watch('name') as string;
  const currentId = watch('id') as string;

  // Local state for visual ordering of stages
  const [visualStages, setVisualStages] = useState<EventStage[]>([]);

  // Mode toggle for rank-based qualification
  const [isRankBasedMode, setIsRankBasedMode] = useState(false);

  // The count field being typed in: it may be empty for a moment, while the
  // form already holds 0 for it.
  const [amountDraft, setAmountDraft] = useState<{
    stageId: string;
    text: string;
  } | null>(null);

  // The row whose fields have focus: a range is incomplete while you type
  // it, so that row's "add the last place" waits until you leave it.
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const [removedByMove, setRemovedByMove] = useState<RemovedByMove | null>(
    null,
  );

  // Set when this section writes qualifiesTo itself. Only data loaded into
  // the form (a stage being opened) re-detects the mode: clearing a range to
  // type a new one must not switch rank-based mode off.
  const isOwnChangeRef = useRef(false);

  const setQualifiesTo = (value: QualifierTarget[]) => {
    isOwnChangeRef.current = true;
    setRemovedByMove(null);
    setValue('qualifiesTo', value);
  };

  // Detect initial mode based on existing data
  useEffect(() => {
    if (isOwnChangeRef.current) {
      isOwnChangeRef.current = false;

      return;
    }

    const hasCompleteRankBasedQualifiers = (qualifiesTo || []).some(
      (target) => target.minRank && target.maxRank,
    );

    setIsRankBasedMode(hasCompleteRankBasedQualifiers);
  }, [qualifiesTo]);

  // Get all stages sorted by order (including current stage if editing)
  const allStages = useMemo(() => {
    const stages = [...configuredEventStages];

    return stages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [configuredEventStages]);

  // How many entries this stage has, or 0 while that isn't known: a new
  // stage, or one that other stages send qualifiers into later.
  const stageSize = useMemo(() => {
    const isFedByOtherStages = allStages.some(
      (stage) =>
        stage.id !== currentId &&
        stage.qualifiesTo?.some((target) => target.targetStageId === currentId),
    );

    if (isFedByOtherStages) return 0;

    // The lineup lives in the assignments (country code -> stage id).
    return Object.values(eventAssignments ?? {}).filter(
      (stageId) => stageId === currentId,
    ).length;
  }, [allStages, currentId, eventAssignments]);

  // Convert between amount-based and rank-based qualification
  const convertToRankBased = () => {
    const currentQualifiesTo = qualifiesTo || [];
    const totalQualifiers = currentQualifiesTo.reduce(
      (sum, target) => sum + target.amount,
      0,
    );

    if (totalQualifiers === 0) {
      setQualifiesTo([]);

      return;
    }

    // Ranges stop at the stage's last place when its size is known.
    const lastPlace = stageSize || Infinity;

    // Convert amounts to rank ranges, latest stage first
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
      const maxRank = Math.min(currentRank + target.amount - 1, lastPlace);

      currentRank = maxRank + 1;

      return {
        targetStageId: stage.id,
        amount: target.amount, // Keep amount for backward compatibility
        minRank,
        maxRank,
      };
    });

    setQualifiesTo(newQualifiesTo);
  };

  const convertToAmountBased = () => {
    const newQualifiesTo = (qualifiesTo || [])
      .map((target) => ({
        targetStageId: target.targetStageId,
        // If rank-based, calculate amount from range
        amount:
          target.minRank && target.maxRank
            ? target.maxRank - target.minRank + 1
            : target.amount,
      }))
      // A half-typed range has no count to carry over.
      .filter((target) => target.amount > 0);

    setQualifiesTo(newQualifiesTo);
  };

  const handleModeChange = (mode: QualifyMode) => {
    const toRankBased = mode === 'places';

    if (toRankBased === isRankBasedMode) return;

    if (toRankBased) {
      convertToRankBased();
    } else {
      convertToAmountBased();
    }
    setIsRankBasedMode(toRankBased);
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

  const findTarget = (stageId: string) =>
    (qualifiesTo || []).find((q) => q.targetStageId === stageId);

  const getQualifierAmount = (stageId: string): number =>
    findTarget(stageId)?.amount || 0;

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

    setQualifiesTo(updated);
  };

  // Update rank range for a specific stage
  const updateQualifierRange = (
    stageId: string,
    minRank?: number,
    maxRank?: number,
  ) => {
    const current = qualifiesTo || [];
    const existingIndex = current.findIndex((q) => q.targetStageId === stageId);

    // An emptied range sends nobody there: drop the target, as a count of 0
    // does (keeping it would save its old count).
    if (minRank == null && maxRank == null) {
      if (existingIndex >= 0) {
        setQualifiesTo(current.filter((_, i) => i !== existingIndex));
      }

      return;
    }

    let updated: QualifierTarget[];

    if (existingIndex >= 0) {
      updated = [...current];
      const existing = updated[existingIndex];
      const derivedAmount =
        minRank != null && maxRank != null && minRank >= 1 && maxRank >= minRank
          ? maxRank - minRank + 1
          : existing.amount;

      updated[existingIndex] = {
        ...existing,
        minRank,
        maxRank,
        amount: derivedAmount,
      };
    } else {
      const derivedAmount =
        minRank != null && maxRank != null && minRank >= 1 && maxRank >= minRank
          ? maxRank - minRank + 1
          : 0;

      updated = [
        ...current,
        {
          targetStageId: stageId,
          amount: derivedAmount,
          minRank,
          maxRank,
        },
      ];
    }

    setQualifiesTo(updated);
  };

  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    const draggedStage = sortableStages[oldIndex];

    // Don't allow reordering the Grand Final
    if (draggedStage?.id === grandFinalStage?.id || oldIndex === newIndex) {
      return;
    }

    const before = {
      visualStages,
      order: currentOrder,
      eventsOrder: (watch('eventsOrder') as string[] | undefined) ?? [],
      qualifiesTo: qualifiesTo || [],
    };

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

    if (currentStageIndex === -1) {
      setRemovedByMove(null);

      return;
    }

    const newCurrentOrder = finalVisualStages[currentStageIndex].order;

    setValue('order', newCurrentOrder);

    // Reset qualifier targets that are now invalid (preceding stages)
    const validQualifiesTo = before.qualifiesTo.filter((target) => {
      const targetStage = finalVisualStages.find(
        (stage) => stage.id === target.targetStageId,
      );

      return targetStage && (targetStage.order ?? 0) > newCurrentOrder;
    });

    if (validQualifiesTo.length === before.qualifiesTo.length) {
      setRemovedByMove(null);

      return;
    }

    const removedNames = before.qualifiesTo
      .filter((target) => !validQualifiesTo.includes(target))
      .map(
        (target) =>
          finalVisualStages.find((stage) => stage.id === target.targetStageId)
            ?.name ?? '',
      )
      .filter(Boolean);

    setQualifiesTo(validQualifiesTo);
    // After setQualifiesTo, which clears the note of an earlier move.
    setRemovedByMove({ stageNames: removedNames, ...before });
  };

  const undoMove = () => {
    if (!removedByMove) return;

    setVisualStages(removedByMove.visualStages);
    setValue('eventsOrder', removedByMove.eventsOrder);
    setValue('order', removedByMove.order);
    setQualifiesTo(removedByMove.qualifiesTo);
  };

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

  const stageName = (stageId: string) =>
    visualStages.find((stage) => stage.id === stageId)?.name ?? '';

  const listNames = (names: string[]) => {
    // Intl.ListFormat is not in the TS lib target but is everywhere we run.
    const { ListFormat } = Intl as unknown as {
      ListFormat?: new (
        locales: string,
        options: { style: string; type: string },
      ) => { format: (items: string[]) => string };
    };

    try {
      if (ListFormat) {
        return new ListFormat(languageTag(locale), {
          style: 'long',
          type: 'conjunction',
        }).format(names);
      }
    } catch {
      // fall through
    }

    return names.join(', ');
  };

  const targets = useMemo(() => qualifiesTo || [], [qualifiesTo]);
  const places = useMemo(
    () => summarizePlaces(targets, stageSize),
    [targets, stageSize],
  );

  // ---------------------------------------------------------------------
  // The line under the rows: where everyone goes.

  let summary: string;

  if (isRankBasedMode) {
    if (places.bands.length === 0) {
      summary = t('nobodyGoesThroughYet');
    } else {
      const parts = places.bands.map((band) =>
        t('placeBand', {
          range: formatPlaceRange(band),
          stage: stageName(band.targetStageId),
        }),
      );

      if (places.out) {
        parts.push(t('placeBandOut', { range: formatPlaceRange(places.out) }));
      }

      const [first] = places.bands;

      summary = t('placesSummary', {
        count: first.to - first.from + 1,
        bands: parts.join(', '),
      });
    }

    if (places.beyondSize) {
      summary += ` ${t('onlyEntries', { size: stageSize })}`;
    }
  } else {
    const total = targets.reduce((sum, target) => sum + target.amount, 0);

    summary = stageSize
      ? t('countSummaryOfSize', { count: total, size: stageSize })
      : t('countSummary', { count: total });

    if (stageSize && total > stageSize) {
      summary += ` ${t('onlyEntries', { size: stageSize })}`;
    }
  }

  // ---------------------------------------------------------------------
  // What keeps the places from saving, named.

  const problemText = (problem: PlaceProblem) => {
    switch (problem.kind) {
      case 'incomplete':
        return problem.missing === 'first'
          ? t('problemFirstMissing', {
              stage: stageName(problem.targetStageId),
            })
          : t('problemLastMissing', {
              stage: stageName(problem.targetStageId),
            });
      case 'reversed':
        return t('problemReversed', {
          stage: stageName(problem.targetStageId),
        });
      case 'overlap':
        return t('problemOverlap', {
          first: stageName(problem.first),
          second: stageName(problem.second),
          place: problem.place,
        });
      case 'gap':
        return t('problemGap', {
          count: problem.to - problem.from + 1,
          range: formatPlaceRange(problem),
        });
    }
  };

  const shownProblems = isRankBasedMode
    ? places.problems.filter(
        (problem) =>
          !(
            problem.kind === 'incomplete' &&
            problem.targetStageId === focusedRowId &&
            submitCount === 0
          ),
      )
    : [];
  // Two rows can break the same rule the same way: say it once.
  const problemLines = Array.from(new Set(shownProblems.map(problemText)));

  // The form refused to save for a reason not named above.
  if (problemLines.length === 0 && errors.qualifiesTo) {
    problemLines.push(t('problemGeneric'));
  }

  const problemsId = `${ids}-problems`;

  // ---------------------------------------------------------------------
  // Rows

  const trackFocus = (stageId: string) => ({
    onFocus: () => setFocusedRowId(stageId),
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setFocusedRowId((id) => (id === stageId ? null : id));
      }
    },
  });

  const clearButton = (
    stage: EventStage,
    hasValue: boolean,
    onClear: () => void,
  ) => (
    <button
      type="button"
      onClick={onClear}
      disabled={!hasValue}
      tabIndex={hasValue ? undefined : -1}
      aria-hidden={hasValue ? undefined : true}
      className={`dp-qual-clear ${hasValue ? '' : 'invisible'}`}
      aria-label={tCommon('clearQualifiersFor', { stage: stage.name })}
      title={tCommon('clear')}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );

  const countControls = (stage: EventStage) => {
    const amount = getQualifierAmount(stage.id);
    const text =
      amountDraft?.stageId === stage.id ? amountDraft.text : String(amount);

    return (
      <div className="dp-qual-controls">
        <button
          type="button"
          className="dp-qual-step"
          onClick={() => updateQualifierAmount(stage.id, amount - 1)}
          disabled={amount === 0}
          aria-label={tCommon('decreaseQualifiersFor', { stage: stage.name })}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const next = digits(e.target.value);

            setAmountDraft({ stageId: stage.id, text: next });
            updateQualifierAmount(stage.id, next ? parseInt(next, 10) : 0);
          }}
          onBlur={() => setAmountDraft(null)}
          className="dp-field dp-qual-num"
          aria-label={t('countFor', { stage: stage.name })}
        />
        <button
          type="button"
          className="dp-qual-step"
          onClick={() => updateQualifierAmount(stage.id, amount + 1)}
          aria-label={tCommon('increaseQualifiersFor', { stage: stage.name })}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        {clearButton(stage, amount > 0, () =>
          updateQualifierAmount(stage.id, 0),
        )}
      </div>
    );
  };

  const placesControls = (stage: EventStage) => {
    const target = findTarget(stage.id);
    const from = target?.minRank;
    const to = target?.maxRank;
    const invalid = places.invalidStageIds.has(stage.id);
    const describedBy =
      invalid && problemLines.length > 0 ? problemsId : undefined;
    const parsePlace = (value: string) => {
      const next = digits(value);

      return next ? parseInt(next, 10) || undefined : undefined;
    };

    return (
      <div className="dp-qual-controls">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={from ?? ''}
          placeholder={from == null ? String(places.nextFreePlace) : undefined}
          onChange={(e) =>
            updateQualifierRange(stage.id, parsePlace(e.target.value), to)
          }
          data-invalid={invalid || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="dp-field dp-qual-num"
          aria-label={t('firstPlaceFor', { stage: stage.name })}
        />
        <span className="dp-qual-dash" aria-hidden="true">
          –
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={to ?? ''}
          onChange={(e) =>
            updateQualifierRange(stage.id, from, parsePlace(e.target.value))
          }
          data-invalid={invalid || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="dp-field dp-qual-num"
          aria-label={t('lastPlaceFor', { stage: stage.name })}
        />
        {clearButton(stage, from != null || to != null, () =>
          updateQualifierRange(stage.id, undefined, undefined),
        )}
      </div>
    );
  };

  const renderRow = (stage: EventStage, sortable: boolean) => {
    const isCurrentStage = stage.id === currentStage.id;
    const isPrecedingStage = (stage.order ?? 0) < currentOrder;

    const grip = (
      <div className="dp-qual-grip" aria-hidden="true">
        {sortable && <DragGripIcon className="size-5" />}
      </div>
    );

    let trailing: React.ReactNode;

    if (isCurrentStage) {
      trailing = <span className="dp-qual-note">{t('thisStage')}</span>;
    } else if (isPrecedingStage) {
      trailing = <span className="dp-qual-note">{t('runsEarlier')}</span>;
    } else {
      trailing = isRankBasedMode ? placesControls(stage) : countControls(stage);
    }

    return (
      <div
        className={`dp-qual-row ${isCurrentStage ? 'is-current' : ''}`}
        data-stage-id={stage.id}
        {...(!isCurrentStage && !isPrecedingStage ? trackFocus(stage.id) : {})}
      >
        {sortable ? <SortableKnob>{grip}</SortableKnob> : grip}
        <span className="dp-qual-name">{stage.name}</span>
        {trailing}
      </div>
    );
  };

  const headingId = `${ids}-heading`;

  return (
    <section aria-labelledby={headingId} className="mt-6 flex flex-col">
      <h3
        id={headingId}
        className="text-[15px] font-extrabold leading-[1.3] tracking-[-.01em]"
      >
        {t('qualifierTargets')}
      </h3>

      <div className="mt-2.5">
        <Segmented<QualifyMode>
          ariaLabel={t('qualifyBy')}
          value={isRankBasedMode ? 'places' : 'count'}
          onChange={handleModeChange}
          options={[
            { value: 'count', label: t('byCount') },
            { value: 'places', label: t('byPlaces') },
          ]}
        />
      </div>

      <div className="dp-qual-list mt-2.5 flex flex-col gap-1.5">
        <SortableList
          onSortEnd={handleSortEnd}
          className="flex flex-col gap-1.5"
          draggedItemClassName="dp-qual-dragged"
        >
          {sortableStages.map((stage) => (
            <SortableItem key={stage.id}>{renderRow(stage, true)}</SortableItem>
          ))}
        </SortableList>

        {/* The last stage always runs last: not draggable. */}
        {grandFinalStage && renderRow(grandFinalStage, false)}
      </div>

      <p className="mt-3 px-1 text-[13px] font-semibold leading-[1.45] text-white/80 text-pretty">
        {summary}
      </p>

      {problemLines.length > 0 && (
        <ul
          id={problemsId}
          aria-live="polite"
          className="mt-1.5 flex flex-col gap-1 px-1 text-[12.5px] font-bold leading-[1.4] text-[var(--badge-red-ink)]"
        >
          {problemLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {removedByMove && (
        <div className="mt-2 flex items-center gap-3 px-1" aria-live="polite">
          <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.4] text-white/80 text-pretty">
            {t('qualifiersRemoved', {
              count: removedByMove.stageNames.length,
              stages: listNames(removedByMove.stageNames),
            })}
          </p>
          <button type="button" onClick={undoMove} className="dp-qual-undo">
            {t('undo')}
          </button>
        </div>
      )}

      {sortableStages.length > 1 && (
        <p className="mt-2 px-1 text-[12px] font-semibold leading-[1.4] text-white/70">
          {t('dragHint')}
        </p>
      )}
    </section>
  );
};

export default QualifierTargetsSection;
