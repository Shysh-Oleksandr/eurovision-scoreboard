import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';

import useDouzePointsAnimation from './useDouzePointsAnimation';

import { getDouzeSpec } from '@/douze/registry';

// A spec animation longer than the overlay's usual 1.5 s after the 12 is
// cleared (the 2024 band runs 2.15 s).
vi.mock('@/theme/useThemeSpecifics', () => ({
  default: () => ({
    boardAnimationMode: 'teleport',
    douzePointsAnimationMode: 'year2024',
    douzeOptions: null,
  }),
}));

afterEach(() => {
  vi.useRealTimers();
});

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

describe('useDouzePointsAnimation overlay', () => {
  it('stays up until a spec animation has played out, though the 12 is cleared sooner', () => {
    vi.useFakeTimers();

    const { durationMs } = getDouzeSpec('year2024')!;
    const { result, rerender } = renderHook(
      ({ isDouze }: { isDouze: boolean }) =>
        useDouzePointsAnimation(isDouze, 'XX', 12, false, 12),
      { initialProps: { isDouze: false } },
    );

    rerender({ isDouze: true });
    expect(result.current.shouldRender).toBe(true);

    // The row doesn't move, so the next jury clears the 12 at once.
    act(() => vi.advanceTimersByTime(300));
    rerender({ isDouze: false });

    act(() => vi.advanceTimersByTime(durationMs - 100));
    expect(result.current.shouldRender).toBe(true);

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.shouldRender).toBe(false);
  });
});
