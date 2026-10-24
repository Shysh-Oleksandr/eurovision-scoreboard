import { create } from 'zustand';

import type { ReportTargetType } from '@/api/reports';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  /** Shown in the dialog title: the item's name, or the user's name. */
  name: string;
  /** The item's creator, offered as "Also block" (not for profile reports). */
  creator?: { _id: string; username?: string; name?: string };
}

interface ReportDialogState {
  target: ReportTarget | null;
  open: (target: ReportTarget) => void;
  close: () => void;
}

/**
 * One report dialog for the whole app (`ReportDialogHost` in Providers), so
 * any card or menu can open it without owning dialog state.
 */
export const useReportDialogStore = create<ReportDialogState>((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));

export const openReportDialog = (target: ReportTarget) =>
  useReportDialogStore.getState().open(target);
