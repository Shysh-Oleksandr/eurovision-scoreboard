import { useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '@/data/data';
import { useScoreboardStore } from '@/state/scoreboardStore';

const useDouzePointsAnimation = (
  isDouzePoints: boolean,
  countryCode: string,
  initialPoints: number | null,
) => {
  const hideDouzePointsAnimation = useScoreboardStore(
    (state) => state.hideDouzePointsAnimation,
  );

  const [shouldRender, setShouldRender] = useState(false);
  const [animationPoints, setAnimationPoints] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isDouzePoints) {
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
  ]);

  return { shouldRender, points: animationPoints };
};

export default useDouzePointsAnimation;
