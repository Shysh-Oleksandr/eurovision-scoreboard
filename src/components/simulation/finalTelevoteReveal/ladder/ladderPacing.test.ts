import { describe, expect, it } from 'vitest';

import { SWAP_S } from './ladderConstants';
import { climbAt, planLadderCount } from './ladderPacing';

/** A repeatable random source, so a win and a loss draw the same climb. */
const seeded = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return state / 4294967296;
  };
};

const base = { startPoints: 93, winAt: 171, speed: 1, linear: false };

describe('planLadderCount', () => {
  it('climbs to the mark and bursts on when the last country wins', () => {
    const plan = planLadderCount({
      ...base,
      finalPoints: 211,
      random: seeded(1),
    });

    expect(plan.win).toBe(true);
    expect(plan.needed).toBe(78);
    expect(climbAt(plan, plan.climbEndAt)).toBeCloseTo(1);
    // Reference: 41 points past the mark in about 1.9 s.
    expect(plan.burstS).toBeCloseTo(1.96, 1);
    expect(plan.swapAt! - plan.climbEndAt).toBeCloseTo(0.7);
    expect(plan.countEndAt).toBeCloseTo(plan.climbEndAt + plan.burstS);
    expect(plan.verdictAt).toBeCloseTo(plan.swapAt! + SWAP_S);
  });

  it('follows the same climb whatever the result, until a loser settles', () => {
    const win = planLadderCount({
      ...base,
      finalPoints: 211,
      random: seeded(7),
    });
    const loss = planLadderCount({
      ...base,
      finalPoints: 160,
      random: seeded(7),
    });
    const lossShare = (160 - 93) / 78;

    expect(loss.win).toBe(false);
    expect(loss.swapAt).toBeNull();
    // Identical while the loser is still well below its total.
    for (let t = 0; t < loss.climbEndAt; t += 0.25) {
      if (climbAt(win, t) > lossShare * 0.8) break;
      expect(climbAt(loss, t)).toBeCloseTo(climbAt(win, t), 6);
    }
    expect(climbAt(loss, loss.climbEndAt)).toBeCloseTo(lossShare);
    // The verdict waits after the stop.
    expect(loss.verdictAt).toBeGreaterThan(loss.climbEndAt);
  });

  it('holds where it is when the last country gets nothing', () => {
    const plan = planLadderCount({
      ...base,
      finalPoints: 93,
      random: seeded(3),
    });

    expect(plan.win).toBe(false);
    expect(plan.climbEndAt).toBe(0);
    expect(plan.verdictAt).toBeGreaterThan(0);
  });

  it('wins by exactly the points needed with a short burst', () => {
    const plan = planLadderCount({
      ...base,
      finalPoints: 171,
      random: seeded(5),
    });

    expect(plan.win).toBe(true);
    expect(plan.burstS).toBeCloseTo(0.8);
  });

  it('divides the climb by the speed setting', () => {
    const slow = planLadderCount({
      ...base,
      finalPoints: 211,
      speed: 0.5,
      random: seeded(9),
    });
    const fast = planLadderCount({
      ...base,
      finalPoints: 211,
      speed: 1.5,
      random: seeded(9),
    });

    expect(slow.climbEndAt).toBeCloseTo(fast.climbEndAt * 3, 5);
  });

  it('climbs at one pace in linear mode', () => {
    const plan = planLadderCount({
      ...base,
      finalPoints: 211,
      linear: true,
    });
    const quarter = climbAt(plan, plan.climbEndAt * 0.5);
    const threeQuarters = climbAt(plan, plan.climbEndAt * 0.75);

    expect(threeQuarters - quarter).toBeCloseTo(0.25, 1);
  });
});
