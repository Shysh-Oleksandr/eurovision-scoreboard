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
  springsActive: {
    outlineWidth: SpringValue<number>;
    backgroundColor: SpringValue<string>;
    color: SpringValue<string>;
  };
};

const useAnimatePoints = (
  shouldShowLastPoints: boolean,
  isDouzePoints: boolean,
  isActive: boolean,
  isJuryVoting: boolean,
  isVotingFinished: boolean,
): ReturnType => {
  const isFirstRender = useRef(true);

  const [springsActive, apiActive] = useSpring(() => ({
    from: { outlineWidth: 0, backgroundColor: '#fff', color: '#172554' },
  }));
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

  useEffect(() => {
    if (isJuryVoting) {
      apiActive.start({
        to: { outlineWidth: 0, backgroundColor: '#fff', color: '#172554' },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });

      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    if (isActive) {
      apiActive.start({
        from: {
          outlineWidth: 0,
          backgroundColor: '#fff',
          color: '#172554',
        },
        to: {
          outlineWidth: 2,
          backgroundColor: '#1d4ed8',
          color: '#fff',
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });
    } else if (isVotingFinished) {
      apiActive.start({
        from: {
          outlineWidth: 2,
          backgroundColor: '#1d4ed8',
        },
        to: {
          outlineWidth: 0,
          backgroundColor: '#1e3a8a',
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });
    }
  }, [apiActive, isActive, isVotingFinished, isJuryVoting]);

  return {
    springsContainer,
    springsText,
    springsDouzeParallelogramBlue,
    springsDouzeParallelogramYellow,
    springsDouzeContainer,
    springsActive,
  };
};

export default useAnimatePoints;
