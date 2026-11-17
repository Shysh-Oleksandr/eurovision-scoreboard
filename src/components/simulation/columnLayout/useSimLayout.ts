import { useSyncExternalStore } from 'react';

import { useGeneralStore } from '@/state/generalStore';

/** Where this device kept its choice before the setting existed. */
const LEGACY_STORAGE_KEY = 'dp-sim-layout';

export type SimLayout = 'classic' | 'column';

const isSimLayout = (value: string | null): value is SimLayout =>
  value === 'classic' || value === 'column';

/**
 * `?simLayout=classic` / `?simLayout=column` in the URL still set the
 * setting, and a choice this device stored before the setting existed moves
 * into it once. Runs when this module loads, after the settings were read
 * from storage and before anything renders, so the layout never flashes.
 */
const adoptLegacyChoice = () => {
  if (typeof window === 'undefined') return;

  try {
    const param = new URLSearchParams(window.location.search).get('simLayout');
    const stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const choice = isSimLayout(param) ? param : stored;

    window.localStorage.removeItem(LEGACY_STORAGE_KEY);

    if (isSimLayout(choice)) {
      useGeneralStore
        .getState()
        .setSettings({ enableClassicSimulationLayout: choice === 'classic' });
    }
  } catch {
    // Storage can be unavailable (private mode); the setting stays as it is.
  }
};

adoptLegacyChoice();

/**
 * Which simulation layout to render: the column layout, unless the user
 * turned on "Use the classic simulation layout" (Settings → Look & feel).
 * The classic layout is deprecated: new work targets the column layout only.
 */
export const useSimLayout = (): SimLayout =>
  useGeneralStore((state) => state.settings.enableClassicSimulationLayout)
    ? 'classic'
    : 'column';

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
