import { useSyncExternalStore } from 'react';

/** A mouse or trackpad is the main pointer: there's no on-screen keyboard. */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(FINE_POINTER_QUERY);

  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
};

/**
 * True with a mouse or trackpad as the main pointer, live (a tablet gaining
 * a trackpad flips it). False on the server.
 */
export const useHasFinePointer = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    () => false,
  );
