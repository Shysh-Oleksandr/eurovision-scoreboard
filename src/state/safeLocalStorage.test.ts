import { afterEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

import { createJSONStorage, persist } from 'zustand/middleware';

import { guardWrites } from './safeLocalStorage';

const post = vi.fn(() => Promise.resolve({}));

vi.mock('@/api/client', () => ({ api: { post } }));

/** A localStorage whose quota is already used up by `big-key`. */
function fullStorage(): Storage {
  const items = new Map([['big-key', 'x'.repeat(1000)]]);

  return {
    get length() {
      return items.size;
    },
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: () => {
      throw new DOMException('quota', 'QuotaExceededError');
    },
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
  };
}

// Each test uses its own key: a key is reported once per page load.
const makeStore = (storage: Storage, name: string) =>
  create<{ stages: number; addStage: () => void }>()(
    persist(
      (set) => ({
        stages: 1,
        addStage: () => set((state) => ({ stages: state.stages + 1 })),
      }),
      {
        name,
        storage: createJSONStorage(() => guardWrites(storage)),
      },
    ),
  );

afterEach(() => post.mockClear());

describe('safeLocalStorage', () => {
  it('lets a store update succeed when the write does not fit', async () => {
    const useStore = makeStore(fullStorage(), 'general-storage');

    expect(() => useStore.getState().addStage()).not.toThrow();
    expect(useStore.getState().stages).toBe(2);
    // Let its report land before the next test counts calls.
    await vi.waitFor(() => expect(post).toHaveBeenCalled());
  });

  it('reports the failed write once per key, with the biggest keys', async () => {
    const useStore = makeStore(fullStorage(), 'scoreboard-storage');

    useStore.getState().addStage();
    useStore.getState().addStage();
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    expect(post).toHaveBeenCalledWith(
      '/errors',
      expect.objectContaining({
        message:
          "Could not save 'scoreboard-storage' to localStorage (QuotaExceededError)",
        generalInfo: expect.objectContaining({
          key: 'scoreboard-storage',
          largestKeys: [{ key: 'big-key', kb: 2 }],
        }),
      }),
    );
  });
});
