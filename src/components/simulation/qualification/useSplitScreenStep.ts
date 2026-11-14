'use client';
import { useEffect, useMemo, useRef } from 'react';

import {
  MAX_SPEED_SECONDS,
  MIN_SPEED_SECONDS,
} from '@/components/presentationPanel/usePresentationLoop';
import { getTotalQualifiersAmount } from '@/helpers/qualifierTargetResolution';
import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Pick qualifiers mode with the split-screen reveal on: whether this step
 * can show a split screen (two or more places left, or the last one when
 * "split screen for the last qualifier" is on), and, by hand, opening it on
 * its own once per step after the delay the presentation speed sets. A
 * presentation opens and resolves it itself (`usePresentationLoop`). Mount
 * once per layout (the classic one and the column one).
 */
export const useSplitScreenStep = () => {
  const enableSplitScreenQualifierRevealMode = useGeneralStore(
    (state) => state.settings.enableSplitScreenQualifierRevealMode,
  );
  const enableSplitScreenForLastQualifier = useGeneralStore(
    (state) => state.settings.enableSplitScreenForLastQualifier,
  );
  const presentationSpeedSeconds = useGeneralStore(
    (state) => state.presentationSettings.presentationSpeedSeconds,
  );
  const isPresenting = useGeneralStore(
    (state) => state.presentationSettings.isPresenting,
  );
  const splitScreenQualifierModalOpen = useScoreboardStore(
    (state) => state.splitScreenQualifierModalOpen,
  );
  const currentStage = useScoreboardStore((state) => state.getCurrentStage());
  const autoOpenRevealKeyRef = useRef<string | null>(null);
  const autoOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const revealStep = useMemo(() => {
    if (!currentStage || currentStage.isOver) return null;
    if (currentStage.id.toUpperCase() === StageId.GF.toUpperCase()) return null;

    const qualifiersAmount = getTotalQualifiersAmount(currentStage.qualifiesTo);

    if (qualifiersAmount <= 0) return null;

    const qualifiedCount = currentStage.countries.filter((country) =>
      country.qualifiedFromStageIds?.includes(currentStage.id),
    ).length;

    return {
      revealKey: `${currentStage.id}:${qualifiedCount}`,
      remainingSlots: qualifiersAmount - qualifiedCount,
    };
  }, [currentStage]);

  const revealKey = revealStep?.revealKey ?? null;
  const remainingSlots = revealStep?.remainingSlots ?? 0;
  const canUseSplitScreenForThisStep =
    remainingSlots > 1 ||
    (enableSplitScreenForLastQualifier && remainingSlots === 1);

  useEffect(() => {
    if (autoOpenTimeoutRef.current) {
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }

    if (!enableSplitScreenQualifierRevealMode || !revealKey) {
      autoOpenRevealKeyRef.current = null;

      return;
    }

    if (!canUseSplitScreenForThisStep) {
      autoOpenRevealKeyRef.current = null;

      return;
    }
    if (isPresenting) return;
    if (autoOpenRevealKeyRef.current === revealKey) return;
    if (splitScreenQualifierModalOpen) return;

    autoOpenRevealKeyRef.current = revealKey;

    const baseSeconds = MAX_SPEED_SECONDS - presentationSpeedSeconds;
    const delayMs = Math.max(MIN_SPEED_SECONDS, baseSeconds) * 1000;

    autoOpenTimeoutRef.current = setTimeout(() => {
      useScoreboardStore.getState().openSplitScreenQualifierModal();
      autoOpenTimeoutRef.current = null;
    }, delayMs);

    return () => {
      if (autoOpenTimeoutRef.current) {
        clearTimeout(autoOpenTimeoutRef.current);
        autoOpenTimeoutRef.current = null;
      }
    };
  }, [
    enableSplitScreenQualifierRevealMode,
    revealKey,
    remainingSlots,
    canUseSplitScreenForThisStep,
    presentationSpeedSeconds,
    isPresenting,
    splitScreenQualifierModalOpen,
  ]);

  return { canUseSplitScreenForThisStep };
};
