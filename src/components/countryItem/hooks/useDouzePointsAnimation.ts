import { useEffect, useRef, useState } from 'react';

import { ANIMATION_DURATION } from '@/data/data';
import { useScoreboardStore } from '@/state/scoreboardStore';

const useDouzePointsAnimation = (
  isDouzePoints: boolean,
  countryCode: string,
) => {
  const hideDouzePointsAnimation = useScoreboardStore(
    (state) => state.hideDouzePointsAnimation,
  );

  const [shouldRender, setShouldRender] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isDouzePoints) {
      setShouldRender(true);
      timerRef.current = setTimeout(() => {
        hideDouzePointsAnimation(countryCode);
      }, ANIMATION_DURATION);
    } else if (shouldRender) {
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
      }, ANIMATION_DURATION / 2);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isDouzePoints, shouldRender, hideDouzePointsAnimation, countryCode]);

  return shouldRender;
};

export default useDouzePointsAnimation;
