import { useState, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dp-sim-layout';

export type SimLayout = 'classic' | 'column';

const isSimLayout = (value: string | null): value is SimLayout =>
  value === 'classic' || value === 'column';

/**
 * Which simulation layout to render: the column layout, unless this device
 * opened the app with `?simLayout=classic` (`?simLayout=column` switches
 * back). The choice sticks on this device.
 */
const readSimLayout = (): SimLayout => {
  if (typeof window === 'undefined') return 'column';

  try {
    const param = new URLSearchParams(window.location.search).get('simLayout');

    if (isSimLayout(param)) {
      window.localStorage.setItem(STORAGE_KEY, param);

      return param;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (isSimLayout(stored)) return stored;
  } catch {
    // Storage can be unavailable (private mode); fall through to the default.
  }

  return 'column';
};

export const useSimLayout = (): SimLayout => useState(readSimLayout)[0];

const DESKTOP_QUERY = '(min-width: 1024px)';

const subscribeDesktop = (onChange: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY);

  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
};

/**
 * Desktop layout (board + spokesperson column) from 1024px; phones and
 * portrait tablets get the bottom sheet. Synchronous on the first render so
 * the layout never flashes the wrong variant.
 */
export const useIsDesktopLayout = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
