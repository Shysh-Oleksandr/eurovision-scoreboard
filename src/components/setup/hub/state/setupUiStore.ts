import { create } from 'zustand';

import { devtools } from 'zustand/middleware';

import type { ListId } from '../lineup/listIds';

export type SetupMenuState =
  | { kind: 'tile'; code: string; listId: ListId }
  | { kind: 'moveAll'; listId: ListId }
  | { kind: 'tray' }
  | null;

/**
 * The element the open menu is anchored to. It lives outside the store state
 * on purpose: the devtools middleware (development only) serializes the whole
 * state on every action, and a React-owned DOM node drags the entire fiber
 * tree (~20k objects) through the Redux DevTools serializer, which made every
 * menu open with a visible delay in browsers that have the extension.
 */
let menuAnchor: HTMLElement | null = null;

export const getMenuAnchor = (): HTMLElement | null => menuAnchor;

interface SetupUiValues {
  selectionMode: boolean;
  selected: Set<string>;
  expanded: Record<ListId, boolean>;
  poolOpen: boolean;
  search: string;
  activeMenu: SetupMenuState;
  draggingCode: string | null;
}

interface SetupUiActions {
  /** Turning selection mode off also clears the selection. */
  setSelectionMode: (v: boolean) => void;
  toggleSelected: (code: string) => void;
  setSelected: (codes: string[]) => void;
  clearSelection: () => void;
  setExpanded: (listId: ListId, v: boolean) => void;
  /**
   * Flip a list. `defaultExpanded` is what the list shows while it has no
   * explicit state, so the first toggle of a list that is open by default
   * collapses it instead of pinning it open.
   */
  toggleExpanded: (listId: ListId, defaultExpanded?: boolean) => void;
  setPoolOpen: (v: boolean) => void;
  setSearch: (v: string) => void;
  /** Opens the menu at `anchor`, or closes it when already open there. */
  openMenu: (m: NonNullable<SetupMenuState>, anchor: HTMLElement) => void;
  closeMenu: () => void;
  setDragging: (code: string | null) => void;
  resetUi: () => void;
}

export type SetupUiState = SetupUiValues & SetupUiActions;

const initialValues = (): SetupUiValues => ({
  selectionMode: false,
  selected: new Set<string>(),
  expanded: {},
  poolOpen: false,
  search: '',
  activeMenu: null,
  draggingCode: null,
});

/**
 * Transient UI state of the Event Setup modal (selection, expanded lists,
 * open menus, drag state). Not persisted — `resetUi` is expected on close.
 */
export const useSetupUiStore = create<SetupUiState>()(
  devtools(
    (set, get) => ({
      ...initialValues(),

      setSelectionMode: (v) =>
        set(
          (state) => ({
            selectionMode: v,
            selected: v ? state.selected : new Set<string>(),
          }),
          undefined,
          'setSelectionMode',
        ),

      toggleSelected: (code) =>
        set(
          (state) => {
            const selected = new Set(state.selected);

            if (selected.has(code)) {
              selected.delete(code);
            } else {
              selected.add(code);
            }

            return { selected };
          },
          undefined,
          'toggleSelected',
        ),

      setSelected: (codes) =>
        set({ selected: new Set(codes) }, undefined, 'setSelected'),

      clearSelection: () =>
        set({ selected: new Set<string>() }, undefined, 'clearSelection'),

      setExpanded: (listId, v) =>
        set(
          (state) => ({ expanded: { ...state.expanded, [listId]: v } }),
          undefined,
          'setExpanded',
        ),

      toggleExpanded: (listId, defaultExpanded = false) =>
        set(
          (state) => ({
            expanded: {
              ...state.expanded,
              [listId]: !(state.expanded[listId] ?? defaultExpanded),
            },
          }),
          undefined,
          'toggleExpanded',
        ),

      setPoolOpen: (v) => set({ poolOpen: v }, undefined, 'setPoolOpen'),

      setSearch: (v) => set({ search: v }, undefined, 'setSearch'),

      openMenu: (m, anchor) => {
        // Clicking the element that opened the menu again closes it.
        if (get().activeMenu && menuAnchor === anchor) {
          get().closeMenu();

          return;
        }

        menuAnchor = anchor;
        set({ activeMenu: m }, undefined, 'openMenu');
      },

      closeMenu: () => {
        menuAnchor = null;
        set({ activeMenu: null }, undefined, 'closeMenu');
      },

      setDragging: (code) =>
        set({ draggingCode: code }, undefined, 'setDragging'),

      resetUi: () => {
        menuAnchor = null;
        set(initialValues(), undefined, 'resetUi');
      },
    }),
    {
      name: 'setup-ui-store',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);
