import deepEqual from 'fast-deep-equal';
import { temporal } from 'zundo';
import { create } from 'zustand';

import { buildLandscapeFixture } from './fixture';
import { Design, DesignElement, newId } from './model';

/**
 * PoC editor store. `design` is the only thing in the undo history; selection
 * and zoom are UI state and are partialized out (same pattern as
 * `scoreboardStore`). Gestures pause the history and commit once on release.
 */
export interface EditorState {
  design: Design;
  selectedId: string | null;
  zoom: number;
  opCount: number;

  setDesign: (design: Design) => void;
  setZoom: (zoom: number) => void;
  select: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  addElement: (element: DesignElement) => void;
  duplicateSelected: () => void;
  removeSelected: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bumpOps: () => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      design: buildLandscapeFixture(),
      selectedId: null,
      zoom: 0.5,
      opCount: 0,

      setDesign: (design) => set({ design, selectedId: null }),
      setZoom: (zoom) => set({ zoom }),
      select: (id) => set({ selectedId: id }),

      updateElement: (id, patch) =>
        set((s) => ({
          design: {
            ...s.design,
            elements: s.design.elements.map((el) =>
              el.id === id ? ({ ...el, ...patch } as DesignElement) : el,
            ),
          },
        })),

      addElement: (element) =>
        set((s) => ({
          design: { ...s.design, elements: [...s.design.elements, element] },
          selectedId: element.id,
        })),

      duplicateSelected: () => {
        const { design, selectedId } = get();
        const src = design.elements.find((e) => e.id === selectedId);

        if (!src) return;
        const copy = {
          ...src,
          id: newId(src.type),
          x: src.x + 20,
          y: src.y + 20,
        } as DesignElement;

        set({
          design: { ...design, elements: [...design.elements, copy] },
          selectedId: copy.id,
        });
      },

      removeSelected: () => {
        const { design, selectedId } = get();

        if (!selectedId) return;
        set({
          design: {
            ...design,
            elements: design.elements.filter((e) => e.id !== selectedId),
          },
          selectedId: null,
        });
      },

      bringForward: (id) =>
        set((s) => {
          const els = [...s.design.elements];
          const i = els.findIndex((e) => e.id === id);

          if (i < 0 || i === els.length - 1) return s;
          [els[i], els[i + 1]] = [els[i + 1], els[i]];

          return { design: { ...s.design, elements: els } };
        }),

      sendBackward: (id) =>
        set((s) => {
          const els = [...s.design.elements];
          const i = els.findIndex((e) => e.id === id);

          if (i <= 0) return s;
          [els[i], els[i - 1]] = [els[i - 1], els[i]];

          return { design: { ...s.design, elements: els } };
        }),

      bumpOps: () => set((s) => ({ opCount: s.opCount + 1 })),
    }),
    {
      partialize: (state) => ({ design: state.design }),
      // Skip pushes that do not change the design (selection, zoom, opCount).
      equality: (a, b) => deepEqual(a, b),
      limit: 200,
    },
  ),
);

export const editorHistory = useEditorStore.temporal;
