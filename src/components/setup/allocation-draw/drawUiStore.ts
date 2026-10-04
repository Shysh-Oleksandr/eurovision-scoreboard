import { create } from 'zustand';

export type DrawDialog = 'enter' | 'leave' | null;

export interface DrawFlash {
  stageId: string | null;
  codes: string[];
}

interface DrawUiState {
  /** Enter / leave draw-mode choice dialog. */
  dialog: DrawDialog;
  windowOpen: boolean;
  /** Tiles to flash after "Show in line-up" (cleared automatically). */
  flash: DrawFlash | null;
  openDialog: (dialog: Exclude<DrawDialog, null>) => void;
  closeDialog: () => void;
  setWindowOpen: (open: boolean) => void;
  setFlash: (flash: DrawFlash | null) => void;
  reset: () => void;
}

/** Transient UI state of the allocation draw (not persisted). */
export const useDrawUiStore = create<DrawUiState>()((set) => ({
  dialog: null,
  windowOpen: false,
  flash: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setWindowOpen: (windowOpen) => set({ windowOpen }),
  setFlash: (flash) => set({ flash }),
  reset: () => set({ dialog: null, windowOpen: false, flash: null }),
}));

let flashTimer: number | null = null;

/** Highlight tiles for a moment (the "Show in line-up" fix). */
export const flashTiles = (flash: DrawFlash, ms = 2600) => {
  if (flashTimer) window.clearTimeout(flashTimer);
  useDrawUiStore.getState().setFlash(flash);
  flashTimer = window.setTimeout(() => {
    useDrawUiStore.getState().setFlash(null);
    flashTimer = null;
  }, ms);
};
