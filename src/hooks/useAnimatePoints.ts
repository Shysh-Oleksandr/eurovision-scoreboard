import { useEffect, useMemo, useRef } from 'react';

import { SpringValue, easings, useSpring } from '@react-spring/web';

import { getCSSVariable } from '../helpers/getCssVariable';

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
  isCountryVotingFinished: boolean,
): ReturnType => {
  const DEFAULT_BG_COLOR = getCSSVariable('--color-country-item-bg');
  const UNFINISHED_TELEVOTE_TEXT_COLOR = getCSSVariable(
    '--color-country-item-televote-unfinished-text',
  );
  const TELEVOTE_TEXT_COLOR = getCSSVariable(
    '--color-country-item-televote-text',
  );
  const FINISHED_VOTING_COLOR = getCSSVariable(
    '--color-country-item-televote-finished-bg',
  );
  const ACTIVE_VOTING_COLOR = getCSSVariable(
    '--color-country-item-televote-active-bg',
  );

  const isFirstRender = useRef(true);

  const [springsActive, apiActive] = useSpring(() => ({
    from: {
      outlineWidth: 0,
      backgroundColor: DEFAULT_BG_COLOR,
      color: UNFINISHED_TELEVOTE_TEXT_COLOR,
    },
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
        to: {
          outlineWidth: 0,
          backgroundColor: DEFAULT_BG_COLOR,
          color: UNFINISHED_TELEVOTE_TEXT_COLOR,
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });

      return;
    }

    if (isActive) {
      apiActive.start({
        from: {
          outlineWidth: 0,
          backgroundColor: DEFAULT_BG_COLOR,
          color: UNFINISHED_TELEVOTE_TEXT_COLOR,
        },
        to: {
          outlineWidth: 2,
          backgroundColor: ACTIVE_VOTING_COLOR,
          color: TELEVOTE_TEXT_COLOR,
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });
    } else if (isCountryVotingFinished) {
      apiActive.start({
        from: {
          outlineWidth: 2,
          backgroundColor: ACTIVE_VOTING_COLOR,
          color: TELEVOTE_TEXT_COLOR,
        },
        to: {
          outlineWidth: 0,
          backgroundColor: FINISHED_VOTING_COLOR,
          color: TELEVOTE_TEXT_COLOR,
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });
    }
  }, [
    ACTIVE_VOTING_COLOR,
    DEFAULT_BG_COLOR,
    TELEVOTE_TEXT_COLOR,
    FINISHED_VOTING_COLOR,
    apiActive,
    isActive,
    isCountryVotingFinished,
    isJuryVoting,
    UNFINISHED_TELEVOTE_TEXT_COLOR,
  ]);

  return useMemo(
    () => ({
      springsContainer,
      springsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsActive,
    }),
    [
      springsActive,
      springsContainer,
      springsDouzeContainer,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsText,
    ],
  );
};

export default useAnimatePoints;
