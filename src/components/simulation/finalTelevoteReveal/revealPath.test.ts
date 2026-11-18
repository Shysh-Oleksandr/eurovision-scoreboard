import { describe, expect, it } from 'vitest';

import {
  REVEAL_PATH_TIMING,
  buildRevealClimb,
  evaluateRevealPath,
  planRevealPath,
  revealPathDuration,
  type RevealPath,
} from './revealPath';

// mulberry32: a small seeded generator so a climb can be replayed.
const seeded = (seed: number) => {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const SEEDS = Array.from({ length: 80 }, (_, i) => i + 1);
const SPEEDS = [0.5, 1, 1.5];

const sample = (path: RevealPath, step = 1 / 120) => {
  const values: { t: number; value: number; slope: number }[] = [];
  const end = revealPathDuration(path);

  for (let t = 0; t <= end + step; t += step) {
    values.push({ t, ...evaluateRevealPath(path, t) });
  }

  return values;
};

describe('buildRevealClimb', () => {
  it.each([false, true])(
    'rises monotonically from rest to the mark (linear %s)',
    (linear) => {
      for (const seed of SEEDS) {
        for (const speed of SPEEDS) {
          const climb = buildRevealClimb({
            speed,
            linear,
            random: seeded(seed),
          });
          const points = sample(climb);

          let worstDrop = 0;

          for (let i = 1; i < points.length; i += 1) {
            worstDrop = Math.max(
              worstDrop,
              points[i - 1]!.value - points[i]!.value,
            );
          }

          expect(points[0]!.value).toBe(0);
          expect(evaluateRevealPath(climb, 1e-4).slope).toBeLessThan(0.01);
          expect(points[points.length - 1]!.value).toBeCloseTo(1, 9);
          expect(worstDrop).toBeLessThanOrEqual(1e-12);
        }
      }
    },
  );

  it('keeps the suspense climb within a sensible length', () => {
    for (const seed of SEEDS) {
      const duration = revealPathDuration(
        buildRevealClimb({ speed: 1, linear: false, random: seeded(seed) }),
      );

      expect(duration).toBeGreaterThan(6);
      expect(duration).toBeLessThan(14);
    }
  });

  it('scales with the speed setting', () => {
    const atOne = revealPathDuration(
      buildRevealClimb({ speed: 1, linear: false, random: seeded(7) }),
    );
    const atHalf = revealPathDuration(
      buildRevealClimb({ speed: 0.5, linear: false, random: seeded(7) }),
    );

    expect(atHalf).toBeCloseTo(atOne * 2, 9);
  });

  it('varies from one reveal to the next', () => {
    const durations = new Set(
      SEEDS.slice(0, 20).map((seed) =>
        revealPathDuration(
          buildRevealClimb({ speed: 1, linear: false, random: seeded(seed) }),
        ).toFixed(3),
      ),
    );

    expect(durations.size).toBe(20);
  });

  it('runs linear mode at one constant pace to the mark', () => {
    const climb = buildRevealClimb({ speed: 1, linear: true });
    const pace = 1 / (REVEAL_PATH_TIMING.linearMarkTime - 0.5);

    expect(revealPathDuration(climb)).toBeCloseTo(9, 9);
    for (const t of [1.5, 4, 8.5]) {
      expect(evaluateRevealPath(climb, t).slope).toBeCloseTo(pace, 9);
    }
  });

  it('never holds longer than the verdict hold', () => {
    for (const seed of SEEDS) {
      const climb = buildRevealClimb({
        speed: 1,
        linear: false,
        random: seeded(seed),
      });

      for (let i = 1; i < climb.length; i += 1) {
        if (climb[i]!.v === climb[i - 1]!.v) {
          expect(climb[i]!.t - climb[i - 1]!.t).toBeLessThan(
            REVEAL_PATH_TIMING.verdictHold,
          );
        }
      }
    }
  });
});

describe('planRevealPath', () => {
  const NEEDED = 120;

  it('gives a winner the climb itself, whatever the margin', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const climb = buildRevealClimb({
        speed: 1,
        linear: false,
        random: seeded(seed),
      });

      for (const received of [NEEDED, NEEDED + 1, NEEDED * 3]) {
        const plan = planRevealPath({
          pointsNeeded: NEEDED,
          receivedPoints: received,
          speed: 1,
          linear: false,
          random: seeded(seed),
        });

        expect(plan.isWinner).toBe(true);
        expect(plan.path).toEqual(climb);
      }
    }
  });

  it.each([false, true])(
    'moves a loser exactly like a winner until just before it stops (linear %s)',
    (linear) => {
      for (const seed of SEEDS) {
        for (const speed of SPEEDS) {
          const climb = buildRevealClimb({
            speed,
            linear,
            random: seeded(seed),
          });

          for (const received of [1, 17, 60, 100, 110, NEEDED - 1]) {
            const target = received / NEEDED;
            const plan = planRevealPath({
              pointsNeeded: NEEDED,
              receivedPoints: received,
              speed,
              linear,
              random: seeded(seed),
            });

            expect(plan.isWinner).toBe(false);

            const stopAt = revealPathDuration(plan.path);
            const settleMax =
              REVEAL_PATH_TIMING.settleFromRestMax / speed + 1e-6;

            let worstDrift = 0;
            let worstOvershoot = 0;

            for (const { t, value } of sample(plan.path)) {
              if (t < stopAt - settleMax) {
                worstDrift = Math.max(
                  worstDrift,
                  Math.abs(value - evaluateRevealPath(climb, t).value),
                );
              }
              worstOvershoot = Math.max(worstOvershoot, value - target);
            }

            expect(worstDrift).toBeLessThan(1e-6);
            expect(worstOvershoot).toBeLessThanOrEqual(1e-9);
            expect(evaluateRevealPath(plan.path, stopAt).value).toBeCloseTo(
              target,
              9,
            );
            expect(plan.verdictHold).toBeGreaterThan(0);
          }
        }
      }
    },
  );

  it('only shows a loser diverging in the moments before it stops', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      for (const speed of SPEEDS) {
        const climb = buildRevealClimb({
          speed,
          linear: false,
          random: seeded(seed),
        });

        for (let received = 1; received < NEEDED; received += 3) {
          const { path } = planRevealPath({
            pointsNeeded: NEEDED,
            receivedPoints: received,
            speed,
            linear: false,
            random: seeded(seed),
          });
          const stopAt = revealPathDuration(path);
          // A quarter of a point at this gap.
          const firstVisible = sample(path).find(
            ({ t, value }) =>
              Math.abs(value - evaluateRevealPath(climb, t).value) > 0.002,
          );

          expect(stopAt - (firstVisible?.t ?? stopAt)).toBeLessThanOrEqual(
            REVEAL_PATH_TIMING.settleFromRestMax / speed + 1e-6,
          );
        }
      }
    }
  });

  it('settles a loser smoothly, without a jump or overshoot', () => {
    for (const seed of SEEDS) {
      const plan = planRevealPath({
        pointsNeeded: NEEDED,
        receivedPoints: 97,
        speed: 1,
        linear: false,
        random: seeded(seed),
      });
      const points = sample(plan.path, 1 / 240);
      let worstDrop = 0;
      let worstSlopeJump = 0;

      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1]!;
        const next = points[i]!;

        worstDrop = Math.max(worstDrop, prev.value - next.value);
        worstSlopeJump = Math.max(
          worstSlopeJump,
          Math.abs(next.slope - prev.slope),
        );
      }

      expect(worstDrop).toBeLessThanOrEqual(1e-12);
      // No speed jumps: neighbouring frames stay within a small change.
      expect(worstSlopeJump).toBeLessThan(0.02);
    }
  });

  it('holds a zero-point televote at the start', () => {
    const plan = planRevealPath({
      pointsNeeded: NEEDED,
      receivedPoints: 0,
      speed: 1,
      linear: false,
    });

    expect(plan.isWinner).toBe(false);
    expect(revealPathDuration(plan.path)).toBe(0);
    expect(evaluateRevealPath(plan.path, 1).value).toBe(0);
  });

  it('copes with a one-point gap', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const lose = planRevealPath({
        pointsNeeded: 1,
        receivedPoints: 0,
        speed: 1,
        linear: false,
        random: seeded(seed),
      });
      const win = planRevealPath({
        pointsNeeded: 1,
        receivedPoints: 1,
        speed: 1,
        linear: false,
        random: seeded(seed),
      });

      expect(lose.isWinner).toBe(false);
      expect(win.isWinner).toBe(true);
    }
  });
});
