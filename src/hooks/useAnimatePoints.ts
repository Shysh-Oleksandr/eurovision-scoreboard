import { useEffect, useMemo, useRef } from 'react';

import { SpringValue, easings, useSpring } from '@react-spring/web';

import { useThemeColor } from '../theme/useThemeColor';

// Consistent animation configs for better cross-platform performance
const containerConfig = { duration: 300, easing: easings.easeInOutCubic };
const textConfig = { duration: 400, easing: easings.easeInOutCubic };
const douzeConfig = { duration: 400, easing: easings.easeInOutCubic };
const parallelogramConfig = {
  duration: 1000,
  easing: easings.easeInOutCubic,
};
const activeConfig = { duration: 500, easing: easings.easeInOutCubic };

const parallelogramsAnimation = {
  from: {
    left: '-20%',
    transform: 'translate3d(0, 0, 0) skewX(45deg)',
  },
  to: {
    left: '120%',
    transform: 'translate3d(0, 0, 0) skewX(-45deg)',
  },
  config: parallelogramConfig,
};

type ReturnType = {
  springsLastPointsContainer: {
    x: SpringValue<number>;
    opacity: SpringValue<number>;
  };
  springsLastPointsText: {
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
  springsPoints: {
    outlineWidth: SpringValue<number>;
    backgroundColor: SpringValue<string>;
    color: SpringValue<string>;
  };
};

const useAnimatePoints = ({
  shouldShowLastPoints,
  isDouzePoints,
  isActive,
  isJuryVoting,
  isCountryVotingFinished,
  isVotingOver,
}: {
  shouldShowLastPoints: boolean;
  isDouzePoints: boolean;
  isActive: boolean;
  isJuryVoting: boolean;
  isCountryVotingFinished: boolean;
  isVotingOver: boolean;
}): ReturnType => {
  const [
    JURY_BG_COLOR,
    JURY_TEXT_COLOR,
    TELEVOTE_UNFINISHED_BG_COLOR,
    TELEVOTE_UNFINISHED_TEXT_COLOR,
    TELEVOTE_ACTIVE_BG_COLOR,
    TELEVOTE_ACTIVE_TEXT_COLOR,
    TELEVOTE_FINISHED_BG_COLOR,
    TELEVOTE_FINISHED_TEXT_COLOR,
  ] = useThemeColor([
    'countryItem.juryBg',
    'countryItem.juryCountryText',
    'countryItem.televoteUnfinishedBg',
    'countryItem.televoteUnfinishedText',
    'countryItem.televoteActiveBg',
    'countryItem.televoteActiveText',
    'countryItem.televoteFinishedBg',
    'countryItem.televoteFinishedText',
  ]);

  const isFirstRender = useRef(true);

  const [springsPoints, pointsApiContainer] = useSpring(() => {
    if (isJuryVoting) {
      return {
        outlineWidth: 0,
        backgroundColor: JURY_BG_COLOR,
        color: JURY_TEXT_COLOR,
        transform: 'translate3d(0, 0, 0)',
      };
    }
    if (isCountryVotingFinished) {
      return {
        outlineWidth: 0,
        backgroundColor: TELEVOTE_FINISHED_BG_COLOR,
        color: TELEVOTE_FINISHED_TEXT_COLOR,
        transform: 'translate3d(0, 0, 0)',
      };
    }
    if (isActive) {
      return {
        outlineWidth: 2,
        backgroundColor: TELEVOTE_ACTIVE_BG_COLOR,
        color: TELEVOTE_ACTIVE_TEXT_COLOR,
        transform: 'translate3d(0, 0, 0)',
      };
    }

    return {
      outlineWidth: 0,
      backgroundColor: TELEVOTE_UNFINISHED_BG_COLOR,
      color: TELEVOTE_UNFINISHED_TEXT_COLOR,
      transform: 'translate3d(0, 0, 0)',
    };
  });

  const [springsLastPointsContainer, lastPointsApiContainer] = useSpring(
    () => ({
      from: { x: 36, opacity: 0, transform: 'translate3d(0, 0, 0)' },
      config: containerConfig,
    }),
  );

  const [springsLastPointsText, lastPointsApiText] = useSpring(() => ({
    from: { x: 15, opacity: 0, transform: 'translate3d(0, 0, 0)' },
    config: textConfig,
  }));

  const [springsDouzeContainer, apiDouzeContainer] = useSpring(() => ({
    from: { opacity: 0, transform: 'translate3d(0, 0, 0)' },
    config: douzeConfig,
  }));

  const [springsDouzeParallelogramBlue, apiDouzeParallelogramBlue] = useSpring(
    () => ({
      from: { left: '-20%', transform: 'translate3d(0, 0, 0) skewX(45deg)' },
      config: parallelogramConfig,
    }),
  );

  const [springsDouzeParallelogramYellow, apiDouzeParallelogramYellow] =
    useSpring(() => ({
      from: { left: '-50%', transform: 'translate3d(0, 0, 0) skewX(45deg)' },
      config: parallelogramConfig,
    }));

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    // Douze points animation
    if (isDouzePoints) {
      apiDouzeContainer.start({
        to: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        delay: 200,
        config: douzeConfig,
      });

      apiDouzeParallelogramBlue.start({
        ...parallelogramsAnimation,
      });

      apiDouzeParallelogramYellow.start({
        ...parallelogramsAnimation,
        from: {
          left: '-50%',
          transform: 'translate3d(0, 0, 0) skewX(45deg)',
        },
      });
    } else {
      apiDouzeContainer.start({
        to: { opacity: 0, transform: 'translate3d(0, 0, 0)' },
        delay: 400,
        config: douzeConfig,
      });

      apiDouzeParallelogramBlue.start({
        to: parallelogramsAnimation.from,
      });

      apiDouzeParallelogramYellow.start({
        to: {
          left: '-50%',
          transform: 'translate3d(0, 0, 0) skewX(45deg)',
        },
      });
    }

    // Last points animation
    if (shouldShowLastPoints) {
      lastPointsApiContainer.start({
        to: { x: 0, opacity: 1, transform: 'translate3d(0, 0, 0)' },
        config: containerConfig,
      });

      lastPointsApiText.start({
        to: { x: 0, opacity: 1, transform: 'translate3d(0, 0, 0)' },
        config: textConfig,
      });
    } else {
      lastPointsApiContainer.start({
        to: { x: 36, opacity: 0, transform: 'translate3d(0, 0, 0)' },
        config: containerConfig,
      });

      lastPointsApiText.start({
        to: { x: 15, opacity: 0, transform: 'translate3d(0, 0, 0)' },
        config: { duration: 0 },
      });
    }
  }, [
    lastPointsApiContainer,
    apiDouzeContainer,
    apiDouzeParallelogramBlue,
    apiDouzeParallelogramYellow,
    lastPointsApiText,
    isDouzePoints,
    shouldShowLastPoints,
    isVotingOver,
  ]);

  useEffect(() => {
    if (isJuryVoting) {
      pointsApiContainer.start({
        to: {
          outlineWidth: 0,
          backgroundColor: JURY_BG_COLOR,
          color: JURY_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
      });

      return;
    }

    if (isActive) {
      pointsApiContainer.start({
        to: {
          outlineWidth: 2,
          backgroundColor: TELEVOTE_ACTIVE_BG_COLOR,
          color: TELEVOTE_ACTIVE_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
      });
    } else if (isCountryVotingFinished) {
      pointsApiContainer.start({
        to: {
          outlineWidth: 0,
          backgroundColor: TELEVOTE_FINISHED_BG_COLOR,
          color: TELEVOTE_FINISHED_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
      });
    } else {
      pointsApiContainer.start({
        to: {
          outlineWidth: 0,
          backgroundColor: TELEVOTE_UNFINISHED_BG_COLOR,
          color: TELEVOTE_UNFINISHED_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
      });
    }
  }, [
    JURY_BG_COLOR,
    JURY_TEXT_COLOR,
    TELEVOTE_UNFINISHED_BG_COLOR,
    TELEVOTE_UNFINISHED_TEXT_COLOR,
    TELEVOTE_ACTIVE_BG_COLOR,
    TELEVOTE_ACTIVE_TEXT_COLOR,
    TELEVOTE_FINISHED_BG_COLOR,
    TELEVOTE_FINISHED_TEXT_COLOR,
    pointsApiContainer,
    isActive,
    isCountryVotingFinished,
    isJuryVoting,
  ]);

  return useMemo(
    () => ({
      springsLastPointsContainer,
      springsLastPointsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsPoints,
    }),
    [
      springsPoints,
      springsLastPointsContainer,
      springsDouzeContainer,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsLastPointsText,
    ],
  );
};

export default useAnimatePoints;
