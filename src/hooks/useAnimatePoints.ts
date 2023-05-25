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
  springsDouzeParallelogramBlue: {
    left: SpringValue<string>;
    transform: SpringValue<string>;
  };
  springsDouzeParallelogramYellow: {
    left: SpringValue<string>;
    transform: SpringValue<string>;
  };
  springsDouzeContainer: {
    opacity: SpringValue<number>;
  };
};

const useAnimatePoints = (
  shouldShowLastPoints: boolean,
  isDouzePoints: boolean,
): ReturnType => {
  const isFirstRender = useRef(true);

  const [springsContainer, apiContainer] = useSpring(() => ({
    from: { x: 36, opacity: 0 },
  }));
  const [springsText, apiText] = useSpring(() => ({
    from: { x: 15, opacity: 0 },
  }));
  const [springsDouzeContainer, apiDouzeContainer] = useSpring(() => ({
    from: { opacity: 0 },
  }));
  const [springsDouzeParallelogramBlue, apiDouzeParallelogramBlue] = useSpring(
    () => ({
      from: { left: '-20%', transform: 'skewX(45deg)' },
    }),
  );
  const [springsDouzeParallelogramYellow, apiDouzeParallelogramYellow] =
    useSpring(() => ({
      from: { left: '-50%', transform: 'skewX(45deg)' },
    }));

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    const parallelogramsAnimation = {
      from: {
        left: '-20%',
        transform: 'skewX(45deg)',
      },
      to: {
        left: '120%',
        transform: 'skewX(-45deg)',
      },
      config: { duration: 1000, easing: easings.easeInOutCubic },
    };

    if (isDouzePoints) {
      apiDouzeContainer.start({
        from: { opacity: 0 },
        to: { opacity: 1 },
        delay: 200,
        config: { duration: 400, easing: easings.easeInOutCubic },
      });

      apiDouzeParallelogramBlue.start({
        ...parallelogramsAnimation,
      });
      apiDouzeParallelogramYellow.start({
        ...parallelogramsAnimation,
        from: {
          left: '-50%',
          transform: 'skewX(45deg)',
        },
      });
    } else {
      apiDouzeContainer.start({
        from: { opacity: 1 },
        to: { opacity: 0 },
        delay: 400,
        config: { duration: 400, easing: easings.easeInOutCubic },
      });
      apiDouzeParallelogramBlue.start({
        from: parallelogramsAnimation.to,
        to: parallelogramsAnimation.from,
      });
      apiDouzeParallelogramYellow.start({
        to: {
          left: '-50%',
          transform: 'skewX(45deg)',
        },
        from: parallelogramsAnimation.to,
      });
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
        from: { x: 15, opacity: 0 },
        to: {
          x: 0,
          opacity: 1,
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
        from: { x: 0, opacity: 1 },
        to: {
          x: 15,
          opacity: 0,
        },
        config: { duration: 0 },
      });
    }
  }, [
    apiContainer,
    apiDouzeContainer,
    apiDouzeParallelogramBlue,
    apiDouzeParallelogramYellow,
    apiText,
    isDouzePoints,
    shouldShowLastPoints,
  ]);

  return {
    springsContainer,
    springsText,
    springsDouzeParallelogramBlue,
    springsDouzeParallelogramYellow,
    springsDouzeContainer,
  };
};

export default useAnimatePoints;
