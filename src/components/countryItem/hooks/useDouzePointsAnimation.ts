import { useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '@/data/data';
import { useScoreboardStore } from '@/state/scoreboardStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const useDouzePointsAnimation = (
  isDouzePoints: boolean,
  countryCode: string,
  initialPoints: number | null,
  ignoreBoardTeleportDelay: boolean = false,
) => {
  const hideDouzePointsAnimation = useScoreboardStore(
    (state) => state.hideDouzePointsAnimation,
  );
  const isBoardTeleportAnimationRunning = useScoreboardStore(
    (state) => state.isBoardTeleportAnimationRunning,
  );
  const { boardAnimationMode } = useThemeSpecifics();

  const [shouldRender, setShouldRender] = useState(false);
  const [animationPoints, setAnimationPoints] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const shouldDelayForTeleport =
      !ignoreBoardTeleportDelay &&
      boardAnimationMode === 'teleport' && isBoardTeleportAnimationRunning;

    if (isDouzePoints && !shouldDelayForTeleport) {
      setShouldRender(true);
      setAnimationPoints(initialPoints);
      timerRef.current = setTimeout(() => {
        hideDouzePointsAnimation(countryCode);
      }, ANIMATION_DURATION);
    } else if (shouldRender) {
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setAnimationPoints(null);
      }, ANIMATION_DURATION / 2);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    isDouzePoints,
    shouldRender,
    hideDouzePointsAnimation,
    countryCode,
    initialPoints,
    ignoreBoardTeleportDelay,
    isBoardTeleportAnimationRunning,
    boardAnimationMode,
  ]);

  return { shouldRender, points: animationPoints };
};

export default useDouzePointsAnimation;
