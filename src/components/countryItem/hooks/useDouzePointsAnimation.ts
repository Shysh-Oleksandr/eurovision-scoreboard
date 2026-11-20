import { useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '@/data/data';
import { type DouzeOptions, douzeDurationScale } from '@/douze/options';
import { doesDouzePlayBeforeMove } from '@/douze/registry';
import { useScoreboardStore } from '@/state/scoreboardStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const useDouzePointsAnimation = (
  isDouzePoints: boolean,
  countryCode: string,
  initialPoints: number | null,
  ignoreBoardTeleportDelay = false,
  /**
   * Changes with every award (the country's total). A whole jury vote given
   * at once can leave the 12 flag up from one jury to the next, so a new 12
   * shows as the total changing while the flag stays true.
   */
  awardKey?: number,
  /** The theme editor's animation options (null: none); otherwise the theme's. */
  douzeOptionsOverride?: DouzeOptions | null,
) => {
  const hideDouzePointsAnimation = useScoreboardStore(
    (state) => state.hideDouzePointsAnimation,
  );

  const [shouldRender, setShouldRender] = useState(false);
  const [animationPoints, setAnimationPoints] = useState<number | null>(null);
  /**
   * Bumped by every new 12. The overlay is keyed by it, so a country that
   * gets 12 again before the previous overlay unmounted (the next jury, a
   * fast presentation) plays it again instead of keeping the finished one.
   */
  const [runId, setRunId] = useState(0);
  const lastAwardRef = useRef<{ isDouze: boolean; key?: number }>({
    isDouze: false,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const last = lastAwardRef.current;

    if (isDouzePoints && (!last.isDouze || awardKey !== last.key)) {
      setRunId((id) => id + 1);
    }
    lastAwardRef.current = { isDouze: isDouzePoints, key: awardKey };
  }, [isDouzePoints, awardKey]);

  // Only track the board-wide teleport flag while this item's overlay is (or
  // is about to be) active — otherwise every item re-rendered twice per
  // teleport cycle just to ignore the value.
  const isBoardTeleportAnimationRunning = useScoreboardStore((state) =>
    isDouzePoints || shouldRender
      ? state.isBoardTeleportAnimationRunning
      : false,
  );
  const { boardAnimationMode, douzePointsAnimationMode, douzeOptions } =
    useThemeSpecifics();
  // The overlay stays up as long as the animation runs ("Customize
  // animation" speed: longer when slower, shorter when faster).
  const slow = douzeDurationScale(
    douzeOptionsOverride !== undefined ? douzeOptionsOverride : douzeOptions,
  );
  // Spec animations that play before the move (2022) start at once; the
  // board waits for them instead (useBoardAnimations' move delay).
  const playsBeforeMove = doesDouzePlayBeforeMove(douzePointsAnimationMode);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const shouldDelayForTeleport =
      !ignoreBoardTeleportDelay &&
      !playsBeforeMove &&
      boardAnimationMode === 'teleport' &&
      isBoardTeleportAnimationRunning;

    if (isDouzePoints && !shouldDelayForTeleport) {
      setShouldRender(true);
      setAnimationPoints(initialPoints);
      timerRef.current = setTimeout(() => {
        hideDouzePointsAnimation(countryCode);
      }, ANIMATION_DURATION * slow);
    } else if (shouldRender) {
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setAnimationPoints(null);
      }, (ANIMATION_DURATION / 2) * slow);
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
    playsBeforeMove,
    // A new 12 with the flag still up restarts the timers too.
    awardKey,
    slow,
  ]);

  return { shouldRender, points: animationPoints, runId };
};

export default useDouzePointsAnimation;
