import { create } from 'zustand';

import {
  GeneralSettingsCategoryId,
  useGeneralStore,
} from '@/state/generalStore';

interface SettingsModalState {
  /** The Settings modal (rendered by `EventSetupModal`, over any screen). */
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  /** Opens Settings → General on one category (the ? shortcut). */
  openAt: (category: GeneralSettingsCategoryId) => void;
}

export const useSettingsModalStore = create<SettingsModalState>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
  openAt: (category) => {
    useGeneralStore.getState().setSettings({
      lastOpenedSettingsTab: 'General',
      lastOpenedGeneralSettingsCategory: category,
    });
    set({ isOpen: true });
  },
}));
