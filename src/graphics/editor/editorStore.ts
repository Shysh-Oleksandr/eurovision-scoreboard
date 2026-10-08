import deepEqual from 'fast-deep-equal';
import { temporal } from 'zundo';
import { create } from 'zustand';

import {
  DataBinding,
  Design,
  DesignCanvas,
  DesignElement,
  DesignTheme,
  Fill,
} from '../model/design';
import { designThemeFromActive } from '../model/designTheme';
import {
  canDelete,
  collectIds,
  findElement,
  mapElements,
  patchElement,
  removeElementsIn,
  updateElementIn,
} from '../model/elements';
import { resizeCanvas } from '../model/resizeCanvas';

import { cloneWithNewIds } from './elementFactory';
import { flattenStacks, hasStacks } from './flatten';
import { BoxMap } from './useElementBoxes';

import { useGeneralStore } from '@/state/generalStore';

export type PanelId = 'add' | 'templates' | 'layers' | 'data';
export type SheetId =
  | 'inspector'
  | 'add'
  | 'templates'
  | 'layers'
  | 'data'
  | 'canvas';
export type ZoomSetting = 'fit' | number;
export type ExportFormat = 'png' | 'jpeg';
export type ExportScale = 1 | 2 | 3;

export interface EditorState {
  /** The document. The only thing in the undo history. */
  design: Design;
  /** IndexedDB record id; `null` until the first save. */
  draftId: string | null;
  /** Cloud `_id` once published as a template; updated in place after. */
  cloudId: string | null;
  dirty: boolean;
  /** Edited since the published copy was last updated (only meaningful with `cloudId`). */
  cloudDirty: boolean;
  savedAt: number | null;
  /** The last autosave failed (validation or storage); shown on close. */
  saveFailed: boolean;
  /**
   * The loaded design still has flow stacks (a template); the stage
   * flattens them into free elements once it has measured them.
   */
  flattenPending: boolean;
  /**
   * The document before the current run of canvas resizes. Consecutive
   * `setCanvasSize` calls re-layout from here so toggling presets is
   * lossless; any other edit clears it.
   */
  resizeBase: Design | null;
  /**
   * Mirror of `design.templateFields`, kept outside the undo history so an
   * Undo after publishing does not drop the published fields.
   */
  templateFields: Design['templateFields'];
  /** Open modals the editor does not own (font picker…); shortcuts pause. */
  modalDepth: number;

  selectedIds: string[];
  hoverId: string | null;
  zoom: ZoomSetting;
  panel: PanelId | null;
  sheet: SheetId | null;
  sheetTab: string | null;
  /** Inspector sections the user opened/closed (`layout` starts closed). */
  openSections: Record<string, boolean>;
  /** A section to open, scroll to and flash (top-bar chips). */
  focusRequest: { id: string; nonce: number } | null;
  exportFormat: ExportFormat;
  exportScale: ExportScale;
  exportOpen: boolean;

  load: (
    design: Design,
    draftId: string | null,
    selectId?: string | null,
    cloudId?: string | null,
  ) => void;
  replaceDesign: (design: Design) => void;
  rename: (name: string) => void;
  markSaved: (draftId: string, savedAt: number) => void;
  setCloudId: (cloudId: string | null) => void;
  /** The published copy now matches the document. */
  markCloudSynced: () => void;
  /** Set the published template's exposed fields (not an undo step). */
  setTemplateFields: (fields: Design['templateFields']) => void;
  /** Replace stacks with free elements at their measured boxes (on open). */
  flatten: (
    boxes: BoxMap,
    measured: { width: number; height: number } | null,
  ) => void;
  setTheme: (theme: DesignTheme) => void;

  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  updateElements: (ids: string[], patch: Partial<DesignElement>) => void;
  updateCanvas: (patch: Partial<DesignCanvas>) => void;
  setCanvasSize: (width: number, height: number) => void;
  setBackground: (fill: Fill) => void;
  setData: (binding: DataBinding) => void;
  addElement: (element: DesignElement) => void;
  duplicateSelected: () => void;
  removeSelected: () => void;
  /** -1 / +1 one step, 'back' / 'front' to the end. */
  reorder: (id: string, how: -1 | 1 | 'back' | 'front') => void;
  moveElement: (id: string, toIndex: number) => void;
  nudge: (dx: number, dy: number) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setHover: (id: string | null) => void;
  setZoom: (zoom: ZoomSetting) => void;
  setPanel: (panel: PanelId | null) => void;
  togglePanel: (panel: PanelId) => void;
  setSheet: (sheet: SheetId | null, tab?: string | null) => void;
  setSheetTab: (tab: string) => void;
  toggleSection: (id: string, defaultOpen: boolean) => void;
  focusSection: (id: string) => void;
  pushModal: () => void;
  popModal: () => void;
  setExport: (patch: {
    format?: ExportFormat;
    scale?: ExportScale;
    open?: boolean;
  }) => void;
  reset: () => void;
}

const EMPTY_DESIGN: Design = {
  id: 'empty',
  name: 'Untitled design',
  version: 1,
  canvas: { width: 1200, height: 630, autoSize: false, background: [] },
  elements: [],
  data: { source: 'live' },
};

const uiDefaults = () => ({
  selectedIds: [] as string[],
  hoverId: null as string | null,
  zoom: 'fit' as ZoomSetting,
  panel: null as PanelId | null,
  sheet: null as SheetId | null,
  sheetTab: null as string | null,
  openSections: {} as Record<string, boolean>,
  focusRequest: null as { id: string; nonce: number } | null,
  exportFormat: 'png' as ExportFormat,
  exportScale: 2 as ExportScale,
  exportOpen: false,
});

/**
 * Editor working state. `design` is the only part of the undo history
 * (zundo `partialize`); selection, zoom and panel state are UI. Gestures
 * pause the history after their first tracked set and resume on release so
 * a drag is one undo entry (see useGestures).
 */
export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      design: EMPTY_DESIGN,
      draftId: null,
      cloudId: null,
      dirty: false,
      cloudDirty: false,
      savedAt: null,
      saveFailed: false,
      flattenPending: false,
      resizeBase: null,
      templateFields: undefined,
      modalDepth: 0,
      ...uiDefaults(),

      load: (loaded, draftId, selectId, cloudId = null) => {
        // A design without a theme of its own takes the app's active one so
        // it keeps this look from now on (see design.ts `theme`).
        const design: Design = loaded.theme
          ? loaded
          : {
              ...loaded,
              theme: designThemeFromActive(useGeneralStore.getState()),
            };

        // A gesture interrupted by an unmount may have left tracking paused.
        useEditorStore.temporal.getState().resume();
        set({
          design,
          draftId,
          cloudId,
          dirty: false,
          cloudDirty: false,
          saveFailed: false,
          savedAt: draftId ? Date.now() : null,
          flattenPending: hasStacks(design),
          resizeBase: null,
          templateFields: design.templateFields,
          modalDepth: 0,
          ...uiDefaults(),
          selectedIds: selectId ? [selectId] : [],
        });
        // A freshly opened design is not an undo step (the clear runs after
        // the set, which pushed the previous document; re-clear the flag).
        useEditorStore.temporal.getState().clear();
        set({ dirty: false });
      },

      replaceDesign: (design) =>
        set((s) => ({
          design: {
            ...design,
            id: s.design.id,
            name: s.design.name,
            theme: design.theme ?? s.design.theme,
          },
          selectedIds: [],
          flattenPending: hasStacks(design),
          dirty: true,
        })),

      rename: (name) =>
        set((s) => ({ design: { ...s.design, name }, dirty: true })),

      markSaved: (draftId, savedAt) => set({ draftId, savedAt, dirty: false }),

      setCloudId: (cloudId) => set({ cloudId }),
      markCloudSynced: () => set({ cloudDirty: false }),

      setTemplateFields: (templateFields) => {
        useEditorStore.temporal.getState().pause();
        set((s) => ({
          design: { ...s.design, templateFields },
          templateFields,
          dirty: true,
        }));
        useEditorStore.temporal.getState().resume();
      },

      flatten: (boxes, measured) => {
        const { design, draftId } = get();

        if (!hasStacks(design)) {
          set({ flattenPending: false });

          return;
        }
        const history = useEditorStore.temporal.getState();
        const { pastStates, futureStates } = history;

        // A saved draft now differs from its record; a fresh template
        // open is still "not saved yet".
        const dirty = draftId ? true : get().dirty;

        set({
          design: flattenStacks(design, boxes, measured),
          flattenPending: false,
        });
        // Flattening is part of opening, not an undo step. The history
        // subscription flips `dirty` on the push above, so set it last.
        history.clear();
        useEditorStore.temporal.setState({ pastStates, futureStates });
        set({ dirty });
      },

      setTheme: (theme) =>
        set((s) => ({ design: { ...s.design, theme }, dirty: true })),

      updateElement: (id, patch) =>
        set((s) => {
          const elements = updateElementIn(s.design.elements, id, patch);

          if (elements === s.design.elements) return s;

          return { design: { ...s.design, elements }, dirty: true };
        }),

      updateElements: (ids, patch) =>
        set((s) => {
          const wanted = new Set(ids);
          const elements = mapElements(s.design.elements, (el) =>
            wanted.has(el.id) ? patchElement(el, patch) : el,
          );

          if (elements === s.design.elements) return s;

          return { design: { ...s.design, elements }, dirty: true };
        }),

      updateCanvas: (patch) =>
        set((s) => ({
          design: { ...s.design, canvas: { ...s.design.canvas, ...patch } },
          dirty: true,
        })),

      setCanvasSize: (width, height) =>
        set((s) => {
          // Re-layout from the document before this run of resizes, so
          // 1200×630 → 1080×1350 → 1200×630 comes back exactly.
          const base = s.resizeBase ?? s.design;
          const design = resizeCanvas(base, width, height);

          return { design, resizeBase: base, dirty: true };
        }),

      setBackground: (fill) =>
        set((s) => ({
          design: {
            ...s.design,
            canvas: { ...s.design.canvas, background: [fill] },
          },
          dirty: true,
        })),

      setData: (binding) =>
        set((s) => ({ design: { ...s.design, data: binding }, dirty: true })),

      addElement: (element) =>
        set((s) => {
          // Step new elements off ones already sitting at the same spot so
          // a second scoreboard does not land exactly on the first.
          let placed = element;
          const taken = (x: number, y: number) =>
            s.design.elements.some(
              (el) => Math.abs(el.x - x) < 2 && Math.abs(el.y - y) < 2,
            );

          for (let i = 0; i < 12 && taken(placed.x, placed.y); i += 1) {
            placed = { ...placed, x: placed.x + 24, y: placed.y + 24 };
          }

          return {
            design: {
              ...s.design,
              elements: [...s.design.elements, placed],
            },
            selectedIds: [placed.id],
            dirty: true,
          };
        }),

      duplicateSelected: () => {
        const { design, selectedIds } = get();
        const copies: DesignElement[] = [];

        selectedIds.forEach((id) => {
          const found = findElement(design.elements, id);

          // Children of stacks are duplicated as free elements.
          if (!found || !canDelete(found.el)) return;
          const copy = cloneWithNewIds(found.el);

          copy.name = `${found.el.name ?? found.el.type} copy`;
          copy.x = (found.el.x ?? 0) + 24;
          copy.y = (found.el.y ?? 0) + 24;
          if (found.parent) {
            copy.w = copy.w ?? 400;
            copy.h = copy.h ?? 60;
          }
          copies.push(copy);
        });
        if (!copies.length) return;
        set({
          design: { ...design, elements: [...design.elements, ...copies] },
          selectedIds: copies.map((c) => c.id),
          dirty: true,
        });
      },

      removeSelected: () => {
        const { design, selectedIds } = get();
        const ids = new Set(
          selectedIds.filter((id) => {
            const found = findElement(design.elements, id);

            return found && canDelete(found.el) && !found.el.locked;
          }),
        );

        if (!ids.size) return;
        set({
          design: {
            ...design,
            elements: removeElementsIn(design.elements, ids),
          },
          selectedIds: [],
          dirty: true,
        });
      },

      reorder: (id, how) =>
        set((s) => {
          const els = [...s.design.elements];
          const i = els.findIndex((e) => e.id === id);

          if (i < 0) return s;
          const j =
            how === 'front'
              ? els.length - 1
              : how === 'back'
              ? 0
              : Math.max(0, Math.min(els.length - 1, i + how));

          if (j === i) return s;
          const [el] = els.splice(i, 1);

          els.splice(j, 0, el);

          return { design: { ...s.design, elements: els }, dirty: true };
        }),

      moveElement: (id, toIndex) =>
        set((s) => {
          const els = [...s.design.elements];
          const i = els.findIndex((e) => e.id === id);

          if (i < 0) return s;
          const [el] = els.splice(i, 1);
          const j = Math.max(0, Math.min(els.length, toIndex));

          els.splice(j, 0, el);
          if (els.every((e, k) => e === s.design.elements[k])) return s;

          return { design: { ...s.design, elements: els }, dirty: true };
        }),

      nudge: (dx, dy) =>
        set((s) => {
          const wanted = new Set(s.selectedIds);
          let changed = false;
          const elements = s.design.elements.map((el) => {
            if (!wanted.has(el.id) || el.locked) return el;
            changed = true;

            return { ...el, x: el.x + dx, y: el.y + dy } as DesignElement;
          });

          if (!changed) return s;

          return { design: { ...s.design, elements }, dirty: true };
        }),

      select: (ids) => set({ selectedIds: ids }),
      toggleSelect: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      clearSelection: () => set({ selectedIds: [] }),
      setHover: (hoverId) =>
        set((s) => (s.hoverId === hoverId ? s : { hoverId })),
      setZoom: (zoom) => set({ zoom }),
      setPanel: (panel) => set({ panel }),
      togglePanel: (panel) =>
        set((s) => ({ panel: s.panel === panel ? null : panel })),
      setSheet: (sheet, tab = null) =>
        set((s) => ({
          sheet,
          sheetTab: tab ?? (sheet === s.sheet ? s.sheetTab : null),
          ...(sheet === null && s.sheet === 'inspector'
            ? { selectedIds: [] }
            : {}),
        })),
      setSheetTab: (sheetTab) => set({ sheetTab }),
      toggleSection: (id, defaultOpen) =>
        set((s) => ({
          openSections: {
            ...s.openSections,
            [id]: !(s.openSections[id] ?? defaultOpen),
          },
        })),
      focusSection: (id) =>
        set((s) => ({
          openSections: { ...s.openSections, [id]: true },
          focusRequest: { id, nonce: (s.focusRequest?.nonce ?? 0) + 1 },
        })),
      pushModal: () => set((s) => ({ modalDepth: s.modalDepth + 1 })),
      popModal: () =>
        set((s) => ({ modalDepth: Math.max(0, s.modalDepth - 1) })),
      setExport: ({ format, scale, open }) =>
        set((s) => ({
          exportFormat: format ?? s.exportFormat,
          exportScale: scale ?? s.exportScale,
          exportOpen: open ?? s.exportOpen,
        })),
      reset: () => {
        set({
          design: EMPTY_DESIGN,
          draftId: null,
          cloudId: null,
          dirty: false,
          cloudDirty: false,
          saveFailed: false,
          savedAt: null,
          flattenPending: false,
          resizeBase: null,
          templateFields: undefined,
          modalDepth: 0,
          ...uiDefaults(),
        });
        useEditorStore.temporal.getState().resume();
        useEditorStore.temporal.getState().clear();
        set({ dirty: false });
      },
    }),
    {
      partialize: (state) => ({ design: state.design }),
      // Skip pushes that do not change the design (selection, zoom…).
      equality: (a, b) => deepEqual(a, b),
      limit: 100,
    },
  ),
);

export const editorHistory = useEditorStore.temporal;

/** Selected elements that still exist (selection may outlive an undo). */
export const selectSelectedElements = (s: EditorState): DesignElement[] =>
  s.selectedIds
    .map((id) => findElement(s.design.elements, id)?.el)
    .filter((el): el is DesignElement => !!el);

/** Drop selection ids that no longer exist after undo/redo/template swaps. */
useEditorStore.subscribe((state, prev) => {
  if (state.design === prev.design) return;
  // Any edit that is not a canvas resize ends the lossless-resize run.
  if (state.resizeBase && state.resizeBase === prev.resizeBase) {
    const sizeChanged =
      state.design.canvas.width !== prev.design.canvas.width ||
      state.design.canvas.height !== prev.design.canvas.height;

    if (!sizeChanged) useEditorStore.setState({ resizeBase: null });
  }
  if (!state.selectedIds.length) return;
  const ids = new Set(collectIds(state.design.elements));
  const kept = state.selectedIds.filter((id) => ids.has(id));

  if (kept.length !== state.selectedIds.length) {
    useEditorStore.setState({ selectedIds: kept });
  }
});

/**
 * Phones show the inspector as a sheet that only renders with a selection:
 * when the selection empties (delete, undo, template swap) fall back to the
 * bottom bar instead of showing nothing.
 */
useEditorStore.subscribe((state, prev) => {
  if (
    state.sheet === 'inspector' &&
    !state.selectedIds.length &&
    prev.selectedIds.length
  ) {
    useEditorStore.setState({ sheet: null, sheetTab: null });
  }
});

/**
 * Undo/redo through zundo also marks the document dirty, and re-applies the
 * published template fields (set outside the history on purpose).
 */
editorHistory.subscribe((state, prev) => {
  if (
    state.pastStates.length !== prev.pastStates.length ||
    state.futureStates.length !== prev.futureStates.length
  ) {
    const current = useEditorStore.getState();

    if (!current.dirty && state.pastStates.length + state.futureStates.length)
      useEditorStore.setState({ dirty: true });
    if (current.design.templateFields !== current.templateFields) {
      editorHistory.getState().pause();
      useEditorStore.setState({
        design: { ...current.design, templateFields: current.templateFields },
      });
      editorHistory.getState().resume();
    }
  }
});

/**
 * Any edit that dirties the draft also means the published copy (if there
 * is one) is behind; `markCloudSynced` clears it after a publish or sync.
 */
useEditorStore.subscribe((state, prev) => {
  if (state.dirty && !prev.dirty && !state.cloudDirty)
    useEditorStore.setState({ cloudDirty: true });
});
