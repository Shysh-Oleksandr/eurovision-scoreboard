import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import {
  type AppPromoMemory,
  INITIAL_APP_PROMO_MEMORY,
} from './appPromoPolicy';

import { safeLocalStorage } from '@/state/safeLocalStorage';

interface AppPromoState extends AppPromoMemory {
  update: (next: (memory: AppPromoMemory) => AppPromoMemory) => void;
}

export const pickAppPromoMemory = ({
  cardDismissals,
  cardHiddenUntil,
  done,
  openRowDismissed,
  remindersShown,
  lastReminderAt,
}: AppPromoMemory): AppPromoMemory => ({
  cardDismissals,
  cardHiddenUntil,
  done,
  openRowDismissed,
  remindersShown,
  lastReminderAt,
});

/**
 * What this browser has seen of the app announcement (appPromoPolicy.ts),
 * kept in localStorage: per browser, so a phone and a computer each get it.
 */
export const useAppPromoStore = create<AppPromoState>()(
  persist<AppPromoState, [], [], AppPromoMemory>(
    (set) => ({
      ...INITIAL_APP_PROMO_MEMORY,
      update: (next) => set((state) => next(pickAppPromoMemory(state))),
    }),
    {
      name: 'app-promo-storage',
      storage: safeLocalStorage(),
      partialize: pickAppPromoMemory,
    },
  ),
);
