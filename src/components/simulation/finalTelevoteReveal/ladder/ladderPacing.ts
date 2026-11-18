import {
  evaluateRevealPath,
  planRevealPath,
  RevealPath,
  revealPathDuration,
} from '../revealPath';

import { SWAP_S } from './ladderConstants';

/**
 * When the ladder's count does what, in seconds from the start of the count.
 *
 * The climb is the Bar style's (`planRevealPath`): it is planned before the
 * result is known, in mark units (0 = the last country's points before its
 * televote, 1 = the total that puts it first). A winner follows it to the
 * mark and bursts on to its total; a country that falls short follows the
 * same climb and only settles at its total in the last moment, then holds
 * longer than any beat before the verdict. So the pace never gives the
 * result away.
 */
export interface LadderCountPlan {
  win: boolean;
  /** The climb, in mark units. */
  path: RevealPath;
  /** Points per mark unit: winAt − startPoints. */
  needed: number;
  /** When the climb ends: the mark (win) or the total (no win). */
  climbEndAt: number;
  /** Win only: the burst from the mark to the final total. */
  burstS: number;
  /** Win only: when the two pills swap places. */
  swapAt: number | null;
  /** When the count lands on the final total. */
  countEndAt: number;
  /** When the outcome is settled: the swap has landed, or the hold is over. */
  verdictAt: number;
}

export interface LadderCountInput {
  startPoints: number;
  finalPoints: number;
  /** The smallest total that puts the last country first. */
  winAt: number;
  /** finalRevealAnimationSpeed, 0.5–1.5. */
  speed: number;
  /** finalRevealLinearAnimation: one constant pace, no beats. */
  linear: boolean;
  random?: () => number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const planLadderCount = ({
  startPoints,
  finalPoints,
  winAt,
  speed,
  linear,
  random,
}: LadderCountInput): LadderCountPlan => {
  const safeSpeed = clamp(speed || 1, 0.25, 4);
  const needed = Math.max(1, winAt - startPoints);
  const { path, isWinner, verdictHold } = planRevealPath({
    pointsNeeded: needed,
    receivedPoints: finalPoints - startPoints,
    speed: safeSpeed,
    linear,
    random,
  });
  const climbEndAt = revealPathDuration(path);

  if (!isWinner) {
    return {
      win: false,
      path,
      needed,
      climbEndAt,
      burstS: 0,
      swapAt: null,
      countEndAt: climbEndAt,
      verdictAt: climbEndAt + verdictHold,
    };
  }

  // Reference: 41 points past the leader took 1.93 s, the swap ~0.7 s in.
  const burstS =
    clamp(0.7 + 0.03 * (finalPoints - winAt + 1), 0.8, 2.4) / safeSpeed;
  const swapAt = climbEndAt + Math.min(0.7, 0.2 + 0.37 * burstS);

  return {
    win: true,
    path,
    needed,
    climbEndAt,
    burstS,
    swapAt,
    countEndAt: climbEndAt + burstS,
    verdictAt: swapAt + SWAP_S,
  };
};

/** How far along the climb the count is at `t` (0 at the start, 1 at the mark). */
export const climbAt = (plan: LadderCountPlan, t: number) =>
  evaluateRevealPath(plan.path, t).value;
