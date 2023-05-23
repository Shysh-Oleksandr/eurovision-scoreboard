import { useEffect, useRef } from 'react';

import { SpringValue, easings, useSpring } from '@react-spring/web';

type ReturnType = {
  springsContainer: {
    x: SpringValue<number>;
    opacity: SpringValue<number>;
  };
  springsText: {
    x: SpringValue<number>;
  };
};

const useAnimatePoints = (shouldShowLastPoints: boolean): ReturnType => {
  const isFirstRender = useRef(true);

  const [springsContainer, apiContainer] = useSpring(() => ({
    from: { x: 36, opacity: 0 },
  }));
  const [springsText, apiText] = useSpring(() => ({
    from: { x: 15 },
  }));

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    if (shouldShowLastPoints) {
      apiContainer.start({
        from: {
          x: 36,
          opacity: 0,
        },
        to: {
          x: 0,
          opacity: 1,
        },
        config: { duration: 300, easing: easings.easeInOutCubic },
      });
      apiText.start({
        from: { x: 15 },
        to: {
          x: 0,
        },
        config: { duration: 400 },
      });
    } else {
      apiContainer.start({
        from: {
          x: 0,
          opacity: 1,
        },
        to: {
          x: 36,
          opacity: 0,
        },
        config: { duration: 300, easing: easings.easeInOutCubic },
      });
      apiText.start({
        from: { x: 0 },
        to: {
          x: 15,
        },
        config: { duration: 400 },
      });
    }
  }, [apiContainer, apiText, shouldShowLastPoints]);

  return { springsContainer, springsText };
};

export default useAnimatePoints;
