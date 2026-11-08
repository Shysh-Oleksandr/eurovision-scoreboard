import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { INITIAL_REVIEW_MEMORY, type ReviewMemory } from './reviewPolicy';

import { safeLocalStorage } from '@/state/safeLocalStorage';

interface ReviewState extends ReviewMemory {
  update: (next: (memory: ReviewMemory) => ReviewMemory) => void;
}

export const pickReviewMemory = ({
  finishedShows,
  showDays,
  asks,
  lastAskAt,
  lastAskVersion,
}: ReviewMemory): ReviewMemory => ({
  finishedShows,
  showDays,
  asks,
  lastAskAt,
  lastAskVersion,
});

/**
 * What the app remembers for the store rating prompt (reviewPolicy.ts), in
 * the WebView's localStorage. Loaded lazily by `index.ts`, apps only.
 */
export const useReviewStore = create<ReviewState>()(
  persist<ReviewState, [], [], ReviewMemory>(
    (set) => ({
      ...INITIAL_REVIEW_MEMORY,
      update: (next) => set((state) => next(pickReviewMemory(state))),
    }),
    {
      name: 'review-prompt-storage',
      storage: safeLocalStorage(),
      partialize: pickReviewMemory,
    },
  ),
);
