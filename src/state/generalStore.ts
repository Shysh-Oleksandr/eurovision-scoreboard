import { create } from 'zustand';

import { persist } from 'zustand/middleware';

import { WHATS_NEW } from '../components/feedbackInfo/data';

interface GeneralState {
  lastSeenUpdate: string | null;
  shouldShowNewChangesIndicator: boolean;
  setLastSeenUpdate: (update: string) => void;
  setShouldShowNewChangesIndicator: (show: boolean) => void;
  checkForNewUpdates: () => void;
}

const getLatestUpdate = () => {
  const [latest] = WHATS_NEW;

  if (latest) {
    return `${latest.date}-${latest.title}`;
  }

  return null;
};

export const useGeneralStore = create<GeneralState>()(
  persist(
    (set, get) => ({
      lastSeenUpdate: null,
      shouldShowNewChangesIndicator: false,
      setLastSeenUpdate: (update: string) => {
        set({ lastSeenUpdate: update });
      },
      setShouldShowNewChangesIndicator: (show: boolean) => {
        set({ shouldShowNewChangesIndicator: show });
      },
      checkForNewUpdates: () => {
        const latestUpdate = getLatestUpdate();
        const { lastSeenUpdate } = get();

        if (latestUpdate && lastSeenUpdate !== latestUpdate) {
          set({ shouldShowNewChangesIndicator: true });
        }
      },
    }),
    {
      name: 'general-storage',
    },
  ),
);
