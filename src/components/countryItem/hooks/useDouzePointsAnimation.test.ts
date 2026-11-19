import { describe, expect, it } from 'vitest';

import { renderHook } from '@testing-library/react';

import useDouzePointsAnimation from './useDouzePointsAnimation';

type Props = { isDouze: boolean; total: number };

const render = () =>
  renderHook(
    ({ isDouze, total }: Props) =>
      useDouzePointsAnimation(isDouze, 'XX', 12, true, total),
    { initialProps: { isDouze: false, total: 0 } },
  );

describe('useDouzePointsAnimation run id', () => {
  it('starts a new run for every 12, so the overlay replays', () => {
    const { result, rerender } = render();

    expect(result.current.runId).toBe(0);

    rerender({ isDouze: true, total: 12 });
    expect(result.current.runId).toBe(1);

    // The flag drops (next jury's first point), then the same country gets
    // 12 again.
    rerender({ isDouze: false, total: 12 });
    rerender({ isDouze: true, total: 24 });
    expect(result.current.runId).toBe(2);
  });

  it('starts a new run when the flag stays up but the total changes', () => {
    // A whole jury vote given at once can set the flag again before it was
    // ever cleared: only the total tells the second 12 apart.
    const { result, rerender } = render();

    rerender({ isDouze: true, total: 12 });
    rerender({ isDouze: true, total: 24 });
    expect(result.current.runId).toBe(2);
  });

  it('keeps the run while nothing new is awarded', () => {
    const { result, rerender } = render();

    rerender({ isDouze: true, total: 12 });
    rerender({ isDouze: true, total: 12 });
    expect(result.current.runId).toBe(1);
  });
});
