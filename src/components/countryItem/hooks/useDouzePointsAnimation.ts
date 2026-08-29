import { useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '@/data/data';
import { useScoreboardStore } from '@/state/scoreboardStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const useDouzePointsAnimation = (
  isDouzePoints: boolean,
  countryCode: string,
  initialPoints: number | null,
  ignoreBoardTeleportDelay = false,
) => {
  const hideDouzePointsAnimation = useScoreboardStore(
    (state) => state.hideDouzePointsAnimation,
  );

  const [shouldRender, setShouldRender] = useState(false);
  const [animationPoints, setAnimationPoints] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Only track the board-wide teleport flag while this item's overlay is (or
  // is about to be) active — otherwise every item re-rendered twice per
  // teleport cycle just to ignore the value.
  const isBoardTeleportAnimationRunning = useScoreboardStore((state) =>
    isDouzePoints || shouldRender
      ? state.isBoardTeleportAnimationRunning
      : false,
  );
  const { boardAnimationMode } = useThemeSpecifics();

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const shouldDelayForTeleport =
      !ignoreBoardTeleportDelay &&
      boardAnimationMode === 'teleport' &&
      isBoardTeleportAnimationRunning;

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
