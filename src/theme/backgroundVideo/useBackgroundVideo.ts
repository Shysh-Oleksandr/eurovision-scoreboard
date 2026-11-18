import { useCallback, useState, useSyncExternalStore } from 'react';

import { useIsBackgroundVideoCovered } from './covers';

import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);

  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
}

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);

  return () => document.removeEventListener('visibilitychange', onChange);
}

const getVisible = () => document.visibilityState === 'visible';

/** SSR and the first client render agree on "no video yet". */
const getServerValue = () => true;

export interface BackgroundVideoState {
  /**
   * The video to show behind the main view, or null for the plain background
   * image: no video on the theme, "Play background videos" off on this
   * device, reduced motion on, or the video failed to load or play.
   */
  src: string | null;
  /** Only while the simulation is on screen and nothing covers it. */
  shouldPlay: boolean;
  /** The video can't load or play here: the image takes over until reload. */
  onFail: () => void;
}

/**
 * When the active custom theme's background video plays (see
 * docs/background-video.md). Used by the main view's `PageWrapper` only, so
 * other pages never load the video.
 */
export function useBackgroundVideo(): BackgroundVideoState {
  const themeSrc = useGeneralStore(
    (state) => state.customTheme?.backgroundVideoUrl || null,
  );
  const settingOn = useGeneralStore(
    (state) => state.settings.playBackgroundVideos !== false,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerValue,
  );
  const pageVisible = useSyncExternalStore(
    subscribeVisibility,
    getVisible,
    getServerValue,
  );
  const hasStages = useScoreboardStore((state) => state.eventStages.length > 0);
  const setupOpen = useCountriesStore((state) => state.eventSetupModalOpen);
  const covered = useIsBackgroundVideoCovered();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const src =
    themeSrc && settingOn && !reducedMotion && failedSrc !== themeSrc
      ? themeSrc
      : null;

  const onFail = useCallback(() => setFailedSrc(themeSrc), [themeSrc]);

  return {
    src,
    shouldPlay: !!src && hasStages && !setupOpen && !covered && pageVisible,
    onFail,
  };
}
