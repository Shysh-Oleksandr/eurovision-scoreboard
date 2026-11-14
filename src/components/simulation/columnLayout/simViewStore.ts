import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { safeLocalStorage } from '@/state/safeLocalStorage';

/** Phones: how many columns the board uses. `auto` fits by measuring names. */
export type PhoneBoardColumns = 'auto' | '1' | '2';

/** What the one-tap Random gives in a jury round: the next value or the whole vote. */
export type QuickRandomScope = 'next' | 'voter';

interface SimViewState {
  /**
   * Board centred and wide, controls in a floating stripe. One switch for
   * voting by hand and presenting alike: Present and Pause never change it.
   */
  minimalView: boolean;
  phoneColumns: PhoneBoardColumns;
  /**
   * The jury scope last picked from the random menu (or the sheet's group);
   * the one-tap Random repeats it. "All juries" never becomes the default.
   */
  quickRandom: QuickRandomScope;
  /**
   * Points were given by tapping a board row at least once on this device:
   * from then on the "Choose a country to give N points" hint stays away.
   */
  boardTapped: boolean;
  setMinimalView: (minimalView: boolean) => void;
  setPhoneColumns: (phoneColumns: PhoneBoardColumns) => void;
  setQuickRandom: (quickRandom: QuickRandomScope) => void;
  setBoardTapped: () => void;
}

/**
 * View preferences of the column simulation layout, kept on this device
 * (not synced with the account, unlike `generalStore` settings).
 */
export const useSimViewStore = create<SimViewState>()(
  persist(
    (set) => ({
      minimalView: false,
      phoneColumns: 'auto',
      quickRandom: 'next',
      boardTapped: false,
      setMinimalView: (minimalView) => set({ minimalView }),
      setPhoneColumns: (phoneColumns) => set({ phoneColumns }),
      setQuickRandom: (quickRandom) => set({ quickRandom }),
      setBoardTapped: () => set({ boardTapped: true }),
    }),
    {
      name: 'sim-view-storage',
      storage: safeLocalStorage(),
      partialize: ({
        minimalView,
        phoneColumns,
        quickRandom,
        boardTapped,
      }) => ({
        minimalView,
        phoneColumns,
        quickRandom,
        boardTapped,
      }),
    },
  ),
);
