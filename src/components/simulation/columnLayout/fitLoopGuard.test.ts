import { describe, expect, it } from 'vitest';

import { createFramePassBudget } from './fitLoopGuard';

describe('createFramePassBudget', () => {
  it('allows the limit per frame, then none until the next frame', () => {
    const frames: (() => void)[] = [];
    const budget = createFramePassBudget(3, (callback) =>
      frames.push(callback),
    );

    expect([1, 2, 3, 4, 5].map(() => budget.spend())).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    // One reset per frame, however many passes asked.
    expect(frames).toHaveLength(1);

    frames.shift()!();
    expect(budget.spend()).toBe(true);
    expect(frames).toHaveLength(1);
  });
});
