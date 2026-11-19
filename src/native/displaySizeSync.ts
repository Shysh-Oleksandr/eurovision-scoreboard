import {
  applyDisplayZoom,
  isDisplaySizeSupported,
  zoomForDisplaySize,
} from './displaySize';

import { useGeneralStore } from '@/state/generalStore';

let started = false;

/**
 * Keeps the page at the `displaySize` setting (src/native/displaySize.ts).
 * Called once while the app bundle loads, before the first render: the saved
 * size is in localStorage, which the persisted store reads synchronously, so
 * the first screen never lays out at the wrong size. A binary that can't
 * scale its page (Android before the `DouzeDisplay` plugin) stays at 100%
 * whatever is saved.
 */
export function startDisplaySizeSync(): void {
  if (started || !isDisplaySizeSupported()) return;
  started = true;

  const sizeOf = () => useGeneralStore.getState().settings.displaySize;
  let applied = sizeOf();

  applyDisplayZoom(zoomForDisplaySize(applied));
  useGeneralStore.subscribe((state) => {
    const size = state.settings.displaySize;

    if (size === applied) return;
    applied = size;
    applyDisplayZoom(zoomForDisplaySize(size));
  });
}
