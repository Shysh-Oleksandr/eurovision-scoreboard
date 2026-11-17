import { useEffect, useRef } from 'react';

import type { ShortcutId } from './actions';

interface Entry {
  id: ShortcutId;
  run: () => void;
}

/**
 * Handlers of the actions on screen. The component that owns an action
 * registers it while the action is available; the latest registration
 * wins, so a screen on top (the jury scale reveal's controls) takes a key
 * over from the one underneath.
 */
let entries: Entry[] = [];
/** Simulations on screen (`useShortcutScope`). */
let scopes = 0;

export const registerShortcut = (id: ShortcutId, run: () => void) => {
  const entry = { id, run };

  entries = [...entries, entry];

  return () => {
    entries = entries.filter((other) => other !== entry);
  };
};

export const getShortcutHandler = (id: ShortcutId): (() => void) | null => {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].id === id) return entries[i].run;
  }

  return null;
};

/** True while a simulation is on screen. */
export const isShortcutScopeActive = () => scopes > 0;

/**
 * Runs `handler` when the action's key is pressed, while `enabled` (the
 * action is available: its button is there and would work). The latest
 * `handler` is called, so it need not be stable.
 */
export const useShortcut = (
  id: ShortcutId,
  handler: () => void,
  enabled = true,
) => {
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return undefined;

    return registerShortcut(id, () => handlerRef.current());
  }, [id, enabled]);
};

/**
 * Marks the simulation as on screen: a shortcut key with nothing to run
 * there is swallowed when a button the mouse left focused would take it.
 */
export const useShortcutScope = () => {
  useEffect(() => {
    scopes += 1;

    return () => {
      scopes -= 1;
    };
  }, []);
};
