import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@testing-library/react';

const load = async () => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_NATIVE_APP', '1');

  return import('./useBackHandler');
};

afterEach(() => vi.unstubAllEnvs());

describe('useBackHandler', () => {
  it('runs the most recently opened handler first', async () => {
    const { useBackHandler, runBackHandler } = await load();
    const calls: string[] = [];

    const modal = renderHook(() =>
      useBackHandler(true, () => calls.push('modal')),
    );
    const menu = renderHook(() =>
      useBackHandler(true, () => calls.push('menu')),
    );

    expect(runBackHandler()).toBe(true);
    menu.unmount();
    expect(runBackHandler()).toBe(true);
    modal.unmount();
    expect(runBackHandler()).toBe(false);
    expect(calls).toEqual(['menu', 'modal']);
  });

  it('registers only while active and calls the latest handler', async () => {
    const { useBackHandler, runBackHandler } = await load();
    const handler = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ active, fn }) => useBackHandler(active, fn),
      { initialProps: { active: false, fn: () => {} } },
    );

    expect(runBackHandler()).toBe(false);
    rerender({ active: true, fn: handler });
    expect(runBackHandler()).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });
});
