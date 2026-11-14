'use client';
import { useTranslations } from 'next-intl';
import { ReactNode, useCallback, useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { useQualifierTargetStageNames } from '../qualification/useQualifierTargetStageNames';

import {
  getQualifierTargetStageNames,
  getTotalQualifiersAmount,
  qualifiesOnlyToGrandFinal,
  shouldShowQualifierTargetLabels,
} from '@/helpers/qualifierTargetResolution';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Pick qualifiers mode, as the column layout shows it: who qualified so far
 * in the order they were named, how many places there are, the latest
 * qualifier (the window's), the split screen's candidates while it is open,
 * and the heading ("Qualified for the Grand Final", "…for Semi-Final 3", or
 * "Qualified entries" when they go to different stages).
 */
export const useQualifiers = () => {
  const t = useTranslations('simulation');
  const { stage, eventStages, qualificationOrder } = useScoreboardStore(
    useShallow((state) => ({
      stage: state.getCurrentStage(),
      eventStages: state.eventStages,
      qualificationOrder: state.qualificationOrder,
    })),
  );
  const { splitOpen, candidates } = useScoreboardStore(
    useShallow((state) => ({
      splitOpen: state.splitScreenQualifierModalOpen,
      candidates: state.splitScreenQualifierCandidates,
    })),
  );
  const { showQualifierTargetStages, splitScreenEnabled } = useGeneralStore(
    useShallow((state) => ({
      showQualifierTargetStages: state.settings.showQualifierTargetStages,
      splitScreenEnabled: state.settings.enableSplitScreenQualifierRevealMode,
    })),
  );

  const total = getTotalQualifiersAmount(stage?.qualifiesTo);
  const isOver = !!stage?.isOver;

  const qualified = useMemo(() => {
    if (!stage) return [];

    const order = qualificationOrder[stage.id] ?? {};

    return stage.countries
      .filter((country) => country.qualifiedFromStageIds?.includes(stage.id))
      .sort((a, b) => (order[a.code] ?? 0) - (order[b.code] ?? 0));
  }, [stage, qualificationOrder]);

  const qualifiedCodes = useMemo(
    () => qualified.map((country) => country.code),
    [qualified],
  );
  const targetNames = useQualifierTargetStageNames(stage, qualifiedCodes);
  const showTargetLabels =
    isOver &&
    shouldShowQualifierTargetLabels(
      stage?.qualifiesTo,
      eventStages,
      showQualifierTargetStages,
    );

  const heading = useMemo(() => {
    const rich = { br: () => ' ', span: (chunks: ReactNode) => chunks };
    const names = getQualifierTargetStageNames(stage?.qualifiesTo, eventStages);

    if (
      !showQualifierTargetStages ||
      qualifiesOnlyToGrandFinal(stage?.qualifiesTo, eventStages)
    ) {
      return t.rich('qualifiedForTheGrandFinal', rich);
    }

    if (names.length === 1) {
      return t.rich('qualifiedForStage', { ...rich, stageName: names[0] });
    }

    return t.rich('qualifiedEntries', rich);
  }, [t, stage?.qualifiesTo, eventStages, showQualifierTargetStages]);

  const splitCandidates: BaseCountry[] =
    splitScreenEnabled && splitOpen && !isOver ? candidates : [];

  return {
    stage,
    isOver,
    total,
    qualified,
    latest: qualified[qualified.length - 1] as BaseCountry | undefined,
    remaining: Math.max(total - qualified.length, 0),
    /** 0-1: the places filled. */
    progress: total ? Math.min(qualified.length / total, 1) : 0,
    heading,
    targetNameFor: (code: string) =>
      showTargetLabels ? targetNames.get(code) : undefined,
    /** The split screen's candidates while it shows; empty otherwise. */
    splitCandidates,
  };
};

export type QualifiersState = ReturnType<typeof useQualifiers>;

/**
 * The random scopes of this mode: the next qualifier (one of the split
 * screen's candidates while it shows), and every place left at once.
 */
export const useQualifierRandom = () => {
  const pickQualifierRandomly = useScoreboardStore(
    (state) => state.pickQualifierRandomly,
  );
  const pickFromSplit = useScoreboardStore(
    (state) => state.pickQualifierFromSplitScreenCandidatesRandomly,
  );

  const next = useCallback(() => {
    const state = useScoreboardStore.getState();
    const { enableSplitScreenQualifierRevealMode } =
      useGeneralStore.getState().settings;

    if (
      enableSplitScreenQualifierRevealMode &&
      state.splitScreenQualifierModalOpen &&
      state.splitScreenQualifierCandidates.length > 0
    ) {
      pickFromSplit();
    } else {
      pickQualifierRandomly();
    }
  }, [pickFromSplit, pickQualifierRandomly]);

  return { next, all: pickAllQualifiersRandomly };
};

/** Fills every place left at random (also Ctrl+F in this mode). */
export const pickAllQualifiersRandomly = () => {
  const store = useScoreboardStore.getState();

  store.closeSplitScreenQualifierModal();

  // One place per call; stop as soon as the stage is over (or nothing moves).
  for (let guard = 0; guard < 200; guard += 1) {
    const stage = useScoreboardStore.getState().getCurrentStage();

    if (!stage || stage.isOver) return;

    const before = stage.countries.filter((country) =>
      country.qualifiedFromStageIds?.includes(stage.id),
    ).length;

    useScoreboardStore.getState().pickQualifierRandomly();

    const after = useScoreboardStore
      .getState()
      .getCurrentStage()
      ?.countries.filter((country) =>
        country.qualifiedFromStageIds?.includes(stage.id),
      ).length;

    if (after === before) return;
  }
};
