import { create } from 'zustand';

import { ShareImageAspectRatio } from '@/state/generalStore';

export type DrawDialog = 'enter' | 'leave' | null;

export interface DrawFlash {
  stageId: string | null;
  codes: string[];
}

/** "Share the draw" choices, kept while the app is open. */
export interface DrawShareOptions {
  aspectRatio: ShareImageAspectRatio;
  flagStyle: 'heart' | 'theme';
  showVoters: boolean;
}

interface DrawUiState {
  /** Enter / leave draw-mode choice dialog. */
  dialog: DrawDialog;
  windowOpen: boolean;
  /** Tiles to flash after "Show in line-up" (cleared automatically). */
  flash: DrawFlash | null;
  /** The "Drawn" chip whose share image is open (line-up, after Apply). */
  shareStageId: string | null;
  shareOptions: DrawShareOptions;
  openDialog: (dialog: Exclude<DrawDialog, null>) => void;
  closeDialog: () => void;
  setWindowOpen: (open: boolean) => void;
  setFlash: (flash: DrawFlash | null) => void;
  setShareStageId: (stageId: string | null) => void;
  setShareOptions: (patch: Partial<DrawShareOptions>) => void;
  reset: () => void;
}

/** Transient UI state of the allocation draw (not persisted). */
export const useDrawUiStore = create<DrawUiState>()((set) => ({
  dialog: null,
  windowOpen: false,
  flash: null,
  shareStageId: null,
  shareOptions: {
    aspectRatio: ShareImageAspectRatio.LANDSCAPE,
    flagStyle: 'heart',
    showVoters: false,
  },
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setWindowOpen: (windowOpen) => set({ windowOpen }),
  setFlash: (flash) => set({ flash }),
  setShareStageId: (shareStageId) => set({ shareStageId }),
  setShareOptions: (patch) =>
    set((state) => ({ shareOptions: { ...state.shareOptions, ...patch } })),
  reset: () =>
    set({ dialog: null, windowOpen: false, flash: null, shareStageId: null }),
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
