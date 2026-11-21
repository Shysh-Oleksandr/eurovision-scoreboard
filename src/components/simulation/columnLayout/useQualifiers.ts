'use client';
import { useTranslations } from 'next-intl';
import { ReactNode, useCallback, useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { useQualifierSections } from '../qualification/useQualifierSections';

import {
  getQualifierTargetStageNames,
  getTotalQualifiersAmount,
  qualifiesOnlyToGrandFinal,
} from '@/helpers/qualifierTargetResolution';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/** The places of one target stage (or of all of them, `useQualifiers`). */
export interface QualifierPlaces {
  key: string;
  /** "Qualified for the Grand Final". */
  heading: ReactNode;
  /** The target stage's name; empty for all the places together. */
  stageName: string;
  /** Its first place among all the places (0-based). */
  start: number;
  size: number;
  /** By place: the qualifier, or undefined while the place is open. */
  places: (BaseCountry | undefined)[];
  filled: number;
}

// The headings' line breaks flattened.
const rich = { br: () => ' ', span: (chunks: ReactNode) => chunks };

const toPlaces = (qualifiers: BaseCountry[], size: number) =>
  Array.from(
    { length: Math.max(size, qualifiers.length) },
    (_, index): BaseCountry | undefined => qualifiers[index],
  );

/**
 * Pick qualifiers mode, as the column layout shows it: who qualified so far
 * in the order they were named, how many places there are, the latest
 * qualifier (the window's), the split screen's candidates while it is open,
 * and the heading ("Qualified for the Grand Final", "…for Semi-Final 3", or
 * "Qualified entries" when they go to different stages).
 *
 * With several target stages (and "Show qualifier target stages" on) the
 * places come in `sections`, one per target stage: the picks fill them one
 * after another (the store keeps it so), and once the stage is over each
 * qualifier sits where its rank sends it.
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

  const groups = useQualifierSections(stage, qualified, !isOver);
  const split = showQualifierTargetStages && groups.length > 1;

  const heading = useMemo(() => {
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

  const sections = useMemo((): QualifierPlaces[] => {
    if (!split) {
      return [
        {
          key: 'all',
          heading,
          stageName: '',
          start: 0,
          size: total,
          places: toPlaces(qualified, total),
          filled: qualified.length,
        },
      ];
    }

    return groups.map((group) => ({
      key: `${group.targetStageId}-${group.start}`,
      heading: t.rich('qualifiedForStage', {
        ...rich,
        stageName: group.stageName,
      }),
      stageName: group.stageName,
      start: group.start,
      size: group.size,
      places: toPlaces(group.qualifiers, group.size),
      filled: group.qualifiers.length,
    }));
  }, [split, groups, heading, total, qualified, t]);

  const latest = qualified[qualified.length - 1] as BaseCountry | undefined;

  const splitCandidates: BaseCountry[] =
    splitScreenEnabled && splitOpen && !isOver ? candidates : [];

  return {
    stage,
    isOver,
    total,
    qualified,
    latest,
    remaining: Math.max(total - qualified.length, 0),
    /** 0-1: the places filled. */
    progress: total ? Math.min(qualified.length / total, 1) : 0,
    heading,
    /** The places, one section per target stage when `split`. */
    sections,
    /** The places are split by target stage. */
    split,
    /** The place the next pick takes (0-based); null once it's over. */
    nextPlace: isOver ? null : qualified.length,
    /** The target stage the next pick goes to. */
    activeSection: isOver
      ? undefined
      : sections.find((section) => section.filled < section.size),
    /** The target stage the latest qualifier goes to. */
    latestSection: latest
      ? sections.find((section) => section.places.includes(latest))
      : undefined,
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
