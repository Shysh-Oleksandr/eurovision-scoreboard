import { useEffect, useRef } from 'react';

import { noteFinishedShow } from '@/native/review';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Counts a finished contest for the apps' store rating prompt
 * (src/native/review) when its winner's celebration starts: the same gate
 * as the fireworks haptic (`useSimulationHaptics`), once per celebration.
 */
export function useReviewShowCounter(celebrationOpen: boolean): void {
  const winnerCode = useScoreboardStore(
    (state) => state.winnerCountry?.code ?? null,
  );
  const isWinnerAnimationAlreadyDisplayed = useScoreboardStore(
    (state) => state.isWinnerAnimationAlreadyDisplayed,
  );
  const countedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!winnerCode) {
      countedCodeRef.current = null;

      return;
    }
    if (!celebrationOpen || isWinnerAnimationAlreadyDisplayed) return;
    if (countedCodeRef.current === winnerCode) return;

    countedCodeRef.current = winnerCode;
    noteFinishedShow();
  }, [winnerCode, celebrationOpen, isWinnerAnimationAlreadyDisplayed]);
}
