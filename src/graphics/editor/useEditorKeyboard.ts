'use client';
import { useEffect } from 'react';

import { findElement } from '../model/elements';

import { editorHistory, useEditorStore } from './editorStore';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' ||
    t.isContentEditable);

/**
 * Editor shortcuts (handoff §4): arrows nudge 1 / Shift 10, ⌘Z / ⇧⌘Z,
 * ⌘D, Delete / Backspace, `[` `]` one step back / forward (⌘ to the end),
 * Esc closes the export popover → the panel → the selection, Enter on a
 * text element focuses its Text field. Inactive while a dialog is open or
 * the user is typing in a field.
 */
export function useEditorKeyboard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const { target } = e;

      if (isTyping(target)) {
        if (e.key === 'Escape') (target as HTMLElement).blur();

        return;
      }
      const s = useEditorStore.getState();
      const meta = e.metaKey || e.ctrlKey;
      const step = e.shiftKey ? 10 : 1;
      const key = e.key.toLowerCase();

      if (meta && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) editorHistory.getState().redo();
        else editorHistory.getState().undo();

        return;
      }
      if (meta && key === 'd') {
        e.preventDefault();
        s.duplicateSelected();

        return;
      }
      if (e.key === 'Escape') {
        if (s.exportOpen) s.setExport({ open: false });
        else if (s.panel) s.setPanel(null);
        else if (s.sheet) s.setSheet(null);
        else s.clearSelection();

        return;
      }
      if (!s.selectedIds.length) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          s.removeSelected();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          s.nudge(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.nudge(step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.nudge(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.nudge(0, step);
          break;
        case ']':
          s.reorder(s.selectedIds[0], meta ? 'front' : 1);
          break;
        case '[':
          s.reorder(s.selectedIds[0], meta ? 'back' : -1);
          break;
        case 'Enter': {
          const one =
            s.selectedIds.length === 1
              ? findElement(s.design.elements, s.selectedIds[0])?.el
              : null;

          if (one?.type === 'text') {
            e.preventDefault();
            setTimeout(() => {
              document
                .querySelector<HTMLTextAreaElement>('[data-gfx-text-field]')
                ?.focus();
            }, 10);
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
