import type { HapticCue } from '@/native/haptics';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * The haptic for a board reorder (docs/haptics.md §4): a ratchet tick per
 * place the furthest-climbing receiver gained, and a double tap when it took
 * the lead. Only rows that just received points count (`receivedByCode`);
 * the rows they pass move down without a cue.
 */
export function getClimbHapticCue(
  previousOrder: string[],
  newOrder: string[],
  receivedByCode: Record<string, boolean>,
  hasDouzePointsAnimation: boolean,
): Extract<HapticCue, { id: 'climb' }> | null {
  let places = 0;

  for (const [code, received] of Object.entries(receivedByCode)) {
    if (!received) continue;

    const from = previousOrder.indexOf(code);
    const to = newOrder.indexOf(code);

    if (from < 0 || to < 0) continue;
    places = Math.max(places, from - to);
  }

  if (places <= 0) return null;

  const [leader] = newOrder;
  const lead =
    !!leader && leader !== previousOrder[0] && !!receivedByCode[leader];

  return { id: 'climb', places, douze: hasDouzePointsAnimation, lead };
}

/**
 * Board moves are only felt while the current stage is being voted on:
 * not when another stage's results or all participants are shown, and not
 * for the stage's last award (the winner and qualifier cues take over).
 */
export function isBoardMoveHapticAllowed(): boolean {
  const state = useScoreboardStore.getState();
  const currentStage = state.getCurrentStage();

  if (!currentStage || currentStage.isOver) return false;
  if (state.showAllParticipants) return false;

  return !state.viewedStageId || state.viewedStageId === currentStage.id;
}
