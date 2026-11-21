const stop = (event: Event) => event.stopPropagation();

/**
 * Callback ref for a button inside a sortable row (remove, move, star):
 * presses on it never start a drag. react-easy-sort listens to `mousedown`
 * through React and to a native `touchstart` on the list, so both are
 * stopped natively, before either sees them.
 */
export const noDrag = (el: HTMLElement | null) => {
  if (!el) return undefined;

  el.addEventListener('touchstart', stop, { passive: true });
  el.addEventListener('mousedown', stop);

  return () => {
    el.removeEventListener('touchstart', stop);
    el.removeEventListener('mousedown', stop);
  };
};
