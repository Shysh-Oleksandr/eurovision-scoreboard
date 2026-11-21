import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { safeLocalStorage } from '@/state/safeLocalStorage';

/**
 * Where Next year was opened from. The button sits in several places while
 * the owner picks which to keep (docs/event-setup-hub-and-design-tokens.md §8).
 */
export type NextYearSource = 'winner' | 'results' | 'menu' | 'setup';

/** The Next year dialog's choices, kept for the next time it opens. */
export interface NextYearPrefs {
  /** Save the finished contest before moving on. */
  save: boolean;
  isPublic: boolean;
  /** After the dialog: the allocation draw, or the setup to change things first. */
  then: 'draw' | 'setup';
}

/**
 * The contest Next year started, so that saving it later (the setup's Save)
 * offers the same group and visibility as the year before. Applies while
 * the open contest still has this name and year and isn't saved.
 */
export interface NextYearChain {
  name: string;
  year: string;
  /** Contest group id, '' for none. */
  groupId: string;
  isPublic: boolean;
}

interface NextYearState {
  isOpen: boolean;
  source: NextYearSource | null;
  prefs: NextYearPrefs;
  chain: NextYearChain | null;
  open: (source: NextYearSource) => void;
  close: () => void;
  setPrefs: (prefs: NextYearPrefs) => void;
  setChain: (chain: NextYearChain | null) => void;
}

export const DEFAULT_NEXT_YEAR_PREFS: NextYearPrefs = {
  save: true,
  // Public is the save dialog's default too.
  isPublic: true,
  then: 'draw',
};

export const useNextYearStore = create<NextYearState>()(
  persist(
    (set) => ({
      isOpen: false,
      source: null,
      prefs: DEFAULT_NEXT_YEAR_PREFS,
      chain: null,
      open: (source) => set({ isOpen: true, source }),
      close: () => set({ isOpen: false }),
      setPrefs: (prefs) => set({ prefs }),
      setChain: (chain) => set({ chain }),
    }),
    {
      name: 'next-year-storage',
      storage: safeLocalStorage(),
      partialize: (state) => ({ prefs: state.prefs, chain: state.chain }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NextYearState>;

        const { save, isPublic, then } = {
          ...DEFAULT_NEXT_YEAR_PREFS,
          ...p.prefs,
        };

        return {
          ...current,
          prefs: { save, isPublic, then },
          chain: p.chain ?? null,
        };
      },
    },
  ),
);

export const openNextYear = (source: NextYearSource) =>
  useNextYearStore.getState().open(source);

/** The group and visibility Next year picked for the open contest, if it's still that one. */
export const getChainDefaults = (settings: {
  contestName: string;
  contestYear: string;
}): Pick<NextYearChain, 'groupId' | 'isPublic'> | null => {
  const { chain } = useNextYearStore.getState();

  return chain &&
    chain.name === settings.contestName &&
    chain.year === settings.contestYear
    ? { groupId: chain.groupId, isPublic: chain.isPublic }
    : null;
};
