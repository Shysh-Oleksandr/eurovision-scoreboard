import { useEffect, useRef } from 'react';

import { playHaptic, prepareHaptics } from '@/native/haptics';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * The simulation's screen-level haptics (docs/haptics.md §4): warms the
 * haptic engine when the board mounts, and plays the winner's fireworks when
 * the celebration starts. `celebrationOpen` is the gate the confetti and the
 * winner modal share (the final reveal has finished, or there is none), so
 * the cue lands with the confetti whether or not it is switched on, instead
 * of when the stage ends behind a reveal that is still running.
 */
export function useSimulationHaptics(celebrationOpen: boolean): void {
  const winnerCode = useScoreboardStore(
    (state) => state.winnerCountry?.code ?? null,
  );
  const isWinnerAnimationAlreadyDisplayed = useScoreboardStore(
    (state) => state.isWinnerAnimationAlreadyDisplayed,
  );
  const celebratedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    prepareHaptics();
  }, []);

  useEffect(() => {
    if (!winnerCode) {
      celebratedCodeRef.current = null;

      return;
    }
    if (!celebrationOpen || isWinnerAnimationAlreadyDisplayed) return;
    if (celebratedCodeRef.current === winnerCode) return;

    celebratedCodeRef.current = winnerCode;
    playHaptic({ id: 'winnerFireworks' });
  }, [winnerCode, celebrationOpen, isWinnerAnimationAlreadyDisplayed]);
}
