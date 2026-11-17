'use client';
import { useEffect } from 'react';

import { getActionForBinding, getShortcutAction } from './actions';
import { bindingFromEvent } from './binding';
import { isMouseFocusedControl, shouldIgnoreShortcut } from './guard';
import { isApplePlatform } from './platform';
import { getShortcutHandler, isShortcutScopeActive } from './registry';

import { hasShortcutBlockingOverlay } from '@/hooks/useBackHandler';
import { useGeneralStore } from '@/state/generalStore';

/**
 * The one key listener behind every keyboard shortcut (docs/keyboard-
 * shortcuts.md). Mount once, in the main view. A press is looked up in the
 * user's keys, checked against the guard (fields, open overlays, held keys,
 * keyboard focus), then runs the handler the action's owner registered with
 * `useShortcut`.
 */
const KeyboardShortcuts = () => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { enableKeyboardShortcuts, keyboardShortcuts } =
        useGeneralStore.getState().settings;

      if (!enableKeyboardShortcuts) return;

      const binding = bindingFromEvent(event, isApplePlatform());

      if (!binding) return;

      const id = getActionForBinding(binding, keyboardShortcuts);

      if (!id) return;

      if (
        shouldIgnoreShortcut({
          event,
          binding,
          worksInFields: getShortcutAction(id).worksInFields,
          hasBlockingOverlay: hasShortcutBlockingOverlay(),
        })
      ) {
        return;
      }

      const handler = getShortcutHandler(id);

      if (handler) {
        // Space must not scroll, ⌘S must not open the save dialog.
        event.preventDefault();
        handler();

        return;
      }

      // Nothing to run (Random while presenting): don't let the key press
      // the button the last click left focused (Setup would reopen).
      if (
        (binding === 'Space' || binding === 'Enter') &&
        isShortcutScopeActive() &&
        isMouseFocusedControl(event.target)
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
};

export default KeyboardShortcuts;
