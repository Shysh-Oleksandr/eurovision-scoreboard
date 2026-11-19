import { describe, expect, it } from 'vitest';

import { getConfettiPlan } from './confettiPlan';

describe('getConfettiPlan', () => {
  it('reproduces the original shower at the default settings', () => {
    expect(
      getConfettiPlan({ amount: 5, durationSeconds: 10, speed: 5 }),
    ).toEqual({
      numberOfPieces: 300,
      gravity: 0.1,
      initialVelocityY: 10,
      tweenDuration: 5000,
      rainMs: 10000,
    });
  });

  it('scales the amount and the fall speed', () => {
    const light = getConfettiPlan({ amount: 1, durationSeconds: 10, speed: 1 });
    const lots = getConfettiPlan({
      amount: 10,
      durationSeconds: 10,
      speed: 10,
    });

    expect(light.numberOfPieces).toBe(60);
    expect(lots.numberOfPieces).toBe(600);
    expect(light.gravity).toBeCloseTo(0.045, 3);
    expect(lots.gravity).toBeCloseTo(0.269, 3);
  });

  it('throws slow pieces lower, and never higher than the default', () => {
    const slow = getConfettiPlan({ amount: 5, durationSeconds: 10, speed: 1 });
    const fast = getConfettiPlan({ amount: 5, durationSeconds: 10, speed: 10 });

    expect(slow.initialVelocityY).toBeLessThan(10);
    expect(fast.initialVelocityY).toBe(10);
  });

  it('ramps up within the first half of a short shower', () => {
    expect(
      getConfettiPlan({ amount: 5, durationSeconds: 5, speed: 5 })
        .tweenDuration,
    ).toBe(2500);
  });

  it('clamps out-of-range and missing values', () => {
    expect(
      getConfettiPlan({ amount: 99, durationSeconds: 1, speed: -3 }),
    ).toMatchObject({ numberOfPieces: 600, rainMs: 5000 });
    expect(
      getConfettiPlan({
        amount: Number.NaN,
        durationSeconds: undefined as unknown as number,
        speed: 5,
      }),
    ).toMatchObject({ numberOfPieces: 300, rainMs: 10000 });
  });
});
