import { create } from 'zustand';

import { Design } from '../model/design';

import type { CloudDesign } from '@/types/design';

/**
 * App-level entry points for the graphics studio: which design the editor
 * should open (from the Hub, a share modal or a template) and whether the
 * Graphics modal is open. The editor itself keeps its working state in
 * `editorStore` and is mounted once by `GraphicsEditorHost`.
 */

export interface OpenEditorRequest {
  design: Design;
  /** IndexedDB draft id when editing an existing record. */
  draftId?: string | null;
  /** Cloud `_id` when the draft was already published. */
  cloudId?: string | null;
  /** Select this element on open (e.g. the scoreboard from a share modal). */
  selectId?: string | null;
  /** Open the Publish dialog straight away. */
  publish?: boolean;
}

/** What the design sheet (handoff §3) is showing: a built-in starter or a cloud design. */
export type TemplateSheetSource =
  | { kind: 'builtin'; templateId: string }
  | { kind: 'cloud'; record: CloudDesign };

export interface TemplateSheetRequest {
  design: Design;
  source: TemplateSheetSource;
}

interface GraphicsStudioState {
  editorRequest: OpenEditorRequest | null;
  editorOpen: boolean;
  isGraphicsModalOpen: boolean;
  /** Tab the Graphics modal opens on next. */
  galleryTab: 'my-designs' | 'explore' | 'saved';
  sheetRequest: TemplateSheetRequest | null;
  /** Bumped whenever a draft is saved/deleted so lists refetch. */
  draftsVersion: number;

  openEditor: (request: OpenEditorRequest) => void;
  closeEditor: () => void;
  setGraphicsModalOpen: (
    open: boolean,
    tab?: GraphicsStudioState['galleryTab'],
  ) => void;
  openSheet: (request: TemplateSheetRequest) => void;
  closeSheet: () => void;
  bumpDrafts: () => void;
}

export const useGraphicsStudioStore = create<GraphicsStudioState>()((set) => ({
  editorRequest: null,
  editorOpen: false,
  isGraphicsModalOpen: false,
  galleryTab: 'my-designs',
  sheetRequest: null,
  draftsVersion: 0,

  openEditor: (request) =>
    set({ editorRequest: request, editorOpen: true, sheetRequest: null }),
  closeEditor: () => set({ editorOpen: false }),
  setGraphicsModalOpen: (open, tab) =>
    set((s) => ({
      isGraphicsModalOpen: open,
      galleryTab: tab ?? (open ? s.galleryTab : 'my-designs'),
    })),
  openSheet: (request) => set({ sheetRequest: request }),
  closeSheet: () => set({ sheetRequest: null }),
  bumpDrafts: () => set((s) => ({ draftsVersion: s.draftsVersion + 1 })),
}));
