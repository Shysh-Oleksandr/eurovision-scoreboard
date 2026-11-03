import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import type { ListId } from '../lineup/listIds';

import { safeLocalStorage } from '@/state/safeLocalStorage';

interface StageAccordionState {
  /**
   * The contest the collapsed stages belong to: a saved contest's id, or
   * `getContestKey(year, contestType)` for a built-in edition.
   */
  contestKey: string | null;
  /** Stage cards (see `isStageCardList`) the user collapsed. */
  collapsed: Record<ListId, true>;
  /** Switching to another contest opens every stage again. */
  setContestKey: (contestKey: string) => void;
  setCollapsed: (listId: ListId, collapsed: boolean) => void;
}

/**
 * Which stage cards are collapsed, kept in localStorage so closing the setup
 * or reloading the page doesn't open them again. Stages start open; the
 * pool's lists stay in the transient `setupUiStore`.
 */
export const useStageAccordionStore = create<StageAccordionState>()(
  persist(
    (set, get) => ({
      contestKey: null,
      collapsed: {},

      setContestKey: (contestKey) => {
        if (get().contestKey === contestKey) return;

        set({ contestKey, collapsed: {} });
      },

      setCollapsed: (listId, collapsed) =>
        set((state) => {
          if (!!state.collapsed[listId] === collapsed) return state;

          const next = { ...state.collapsed };

          if (collapsed) next[listId] = true;
          else delete next[listId];

          return { collapsed: next };
        }),
    }),
    {
      name: 'stage-accordion-storage',
      storage: safeLocalStorage(),
      partialize: ({ contestKey, collapsed }) => ({ contestKey, collapsed }),
    },
  ),
);
