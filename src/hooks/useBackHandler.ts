import { useEffect, useRef } from 'react';

import { IS_NATIVE_APP } from '@/native/platform';

/**
 * What Android's back button closes, innermost first (see
 * `src/native/backButton.ts` and docs/native-apps.md §4). Overlays that can
 * be dismissed (modals, menus, popovers, dialogs) register while open; the
 * most recently opened one handles the next press. Only the native apps read
 * the stack, so nothing registers on the website.
 */
const stack: { run: () => void }[] = [];

/**
 * Registers `handler` for the back button while `active`. Pass a no-op to
 * make an undismissable overlay swallow the press instead of letting it close
 * what lies below. The latest `handler` is called, so it need not be stable.
 */
export function useBackHandler(active: boolean, handler: () => void): void {
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (!active || !IS_NATIVE_APP) return undefined;

    const entry = { run: () => handlerRef.current() };

    stack.push(entry);

    return () => {
      const index = stack.indexOf(entry);

      if (index >= 0) stack.splice(index, 1);
    };
  }, [active]);
}

/** Runs the innermost handler; false when nothing is registered. */
export function runBackHandler(): boolean {
  const top = stack[stack.length - 1];

  if (!top) return false;
  top.run();

  return true;
}
