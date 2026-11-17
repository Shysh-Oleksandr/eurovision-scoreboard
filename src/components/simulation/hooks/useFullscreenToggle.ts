import { useEffect, useState } from 'react';

import { IS_NATIVE_APP } from '@/native/platform';
import { useGeneralStore } from '@/state/generalStore';

/**
 * The browser's fullscreen, the same switch as Settings → "Enable fullscreen
 * mode" (`useFullscreen` applies it). Not in the apps (full screen already)
 * nor where the browser has no Fullscreen API (iPhone Safari).
 */
export const useFullscreenToggle = () => {
  const enabled = useGeneralStore((state) => state.settings.enableFullscreen);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(!IS_NATIVE_APP && !!document.fullscreenEnabled);
  }, []);

  return {
    supported,
    enabled,
    toggle: () => setSettings({ enableFullscreen: !enabled }),
  };
};
