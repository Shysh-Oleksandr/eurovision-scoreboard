import { useState, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dp-sim-layout';

export type SimLayout = 'classic' | 'column';

const isSimLayout = (value: string | null): value is SimLayout =>
  value === 'classic' || value === 'column';

/**
 * Which simulation layout to render. The column layout is in preview: open
 * the app with `?simLayout=column` (or `?simLayout=classic` to go back) and
 * the choice sticks on this device. Development builds default to the column
 * layout so `yarn dev` / `yarn dev:native` show it straight away.
 */
const readSimLayout = (): SimLayout => {
  if (typeof window === 'undefined') return 'classic';

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

  return process.env.NODE_ENV === 'development' ? 'column' : 'classic';
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
