import { afterEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

import { createJSONStorage, persist } from 'zustand/middleware';

import { describeValue, guardWrites } from './safeLocalStorage';

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

describe('describeValue', () => {
  it("names the state's biggest fields and its biggest entry's fields", () => {
    const stage = (countries: number) => ({
      id: `stage-${countries}`,
      countries: Array.from({ length: countries }, (_, i) => ({
        code: `C${i}`,
        name: 'x'.repeat(200),
      })),
      votingCountries: [],
    });
    const value = JSON.stringify({
      state: {
        eventStages: [stage(5), stage(40)],
        currentStageId: 'stage-40',
        predefinedVotes: {},
      },
      version: 0,
    });

    const described = describeValue(value)!;

    expect(described.fields[0]).toMatchObject({ key: 'eventStages', items: 2 });
    expect(described.fields.map((field) => field.key)).toEqual([
      'eventStages',
      'currentStageId',
      'predefinedVotes',
    ]);
    // The 40-country stage, not the first one.
    expect(described.biggestEntry![0]).toMatchObject({
      key: 'countries',
      items: 40,
    });
  });

  it('gives up quietly on a value that is not JSON', () => {
    expect(describeValue('not json')).toBeUndefined();
    expect(describeValue('42')).toBeUndefined();
  });
});
