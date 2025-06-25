import { useEffect, useMemo, useRef } from 'react';

import { SpringValue, easings, useSpring } from '@react-spring/web';

import { useScoreboardStore } from '../state/scoreboardStore';
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
  const { isFinalAnimationFinished, setFinalAnimationFinished, winnerCountry } =
    useScoreboardStore((state) => state);
  const [
    DEFAULT_BG_COLOR,
    UNFINISHED_TELEVOTE_TEXT_COLOR,
    TELEVOTE_COUNTRY_TEXT_COLOR,
    FINISHED_VOTING_COLOR,
    ACTIVE_VOTING_COLOR,
  ] = useThemeColor([
    'countryItem.bg',
    'countryItem.televoteUnfinishedText',
    'countryItem.televoteCountryText',
    'countryItem.televoteFinishedBg',
    'countryItem.televoteActiveBg',
  ]);

  const isFirstRender = useRef(true);

  const [springsActive, apiActive] = useSpring(() => {
    if (isJuryVoting) {
      return {
        outlineWidth: 0,
        backgroundColor: DEFAULT_BG_COLOR,
        color: UNFINISHED_TELEVOTE_TEXT_COLOR,
        transform: 'translate3d(0, 0, 0)',
      };
    }
    if (isCountryVotingFinished) {
      return {
        outlineWidth: 0,
        backgroundColor: FINISHED_VOTING_COLOR,
        color: TELEVOTE_COUNTRY_TEXT_COLOR,
        transform: 'translate3d(0, 0, 0)',
      };
    }
    if (isActive) {
      return {
        outlineWidth: 2,
        backgroundColor: ACTIVE_VOTING_COLOR,
        color: TELEVOTE_COUNTRY_TEXT_COLOR,
        transform: 'translate3d(0, 0, 0)',
      };
    }

    return {
      outlineWidth: 0,
      backgroundColor: DEFAULT_BG_COLOR,
      color: UNFINISHED_TELEVOTE_TEXT_COLOR,
      transform: 'translate3d(0, 0, 0)',
    };
  });

  const [springsContainer, apiContainer] = useSpring(() => ({
    from: { x: 36, opacity: 0, transform: 'translate3d(0, 0, 0)' },
    config: containerConfig,
  }));

  const [springsText, apiText] = useSpring(() => ({
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

    const immediate = isFinalAnimationFinished;

    // Douze points animation
    if (isDouzePoints) {
      apiDouzeContainer.start({
        to: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        delay: 200,
        config: douzeConfig,
        immediate,
      });

      apiDouzeParallelogramBlue.start({
        ...parallelogramsAnimation,
        immediate,
      });

      apiDouzeParallelogramYellow.start({
        ...parallelogramsAnimation,
        from: {
          left: '-50%',
          transform: 'translate3d(0, 0, 0) skewX(45deg)',
        },
        immediate,
      });
    } else {
      apiDouzeContainer.start({
        to: { opacity: 0, transform: 'translate3d(0, 0, 0)' },
        delay: 400,
        config: douzeConfig,
        immediate,
      });

      apiDouzeParallelogramBlue.start({
        to: parallelogramsAnimation.from,
        immediate,
      });

      apiDouzeParallelogramYellow.start({
        to: {
          left: '-50%',
          transform: 'translate3d(0, 0, 0) skewX(45deg)',
        },
        immediate,
      });
    }

    // Last points animation
    if (shouldShowLastPoints) {
      apiContainer.start({
        to: { x: 0, opacity: 1, transform: 'translate3d(0, 0, 0)' },
        config: containerConfig,
        immediate,
      });

      apiText.start({
        to: { x: 0, opacity: 1, transform: 'translate3d(0, 0, 0)' },
        config: textConfig,
        immediate,
      });
    } else if (!isFinalAnimationFinished) {
      if (winnerCountry) {
        setTimeout(() => {
          setFinalAnimationFinished(true);
        }, 4000);
      }

      apiContainer.start({
        to: { x: 36, opacity: 0, transform: 'translate3d(0, 0, 0)' },
        config: containerConfig,
        immediate,
      });

      apiText.start({
        to: { x: 15, opacity: 0, transform: 'translate3d(0, 0, 0)' },
        config: { duration: 0 },
        immediate,
      });
    }
    // Deliberately not including winnerCountry and isFinalAnimationFinished in the dependency array to avoid animation issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiContainer,
    apiDouzeContainer,
    apiDouzeParallelogramBlue,
    apiDouzeParallelogramYellow,
    apiText,
    isDouzePoints,
    shouldShowLastPoints,
    isVotingOver,
    parallelogramsAnimation,
    setFinalAnimationFinished,
  ]);

  useEffect(() => {
    const immediate = isFinalAnimationFinished;

    if (isJuryVoting) {
      apiActive.start({
        to: {
          outlineWidth: 0,
          backgroundColor: DEFAULT_BG_COLOR,
          color: UNFINISHED_TELEVOTE_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
        immediate,
      });

      return;
    }

    if (isActive) {
      apiActive.start({
        to: {
          outlineWidth: 2,
          backgroundColor: ACTIVE_VOTING_COLOR,
          color: TELEVOTE_COUNTRY_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
        immediate,
      });
    } else if (isCountryVotingFinished) {
      apiActive.start({
        to: {
          outlineWidth: 0,
          backgroundColor: FINISHED_VOTING_COLOR,
          color: TELEVOTE_COUNTRY_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
        immediate,
      });
    } else {
      apiActive.start({
        to: {
          outlineWidth: 0,
          backgroundColor: DEFAULT_BG_COLOR,
          color: UNFINISHED_TELEVOTE_TEXT_COLOR,
          transform: 'translate3d(0, 0, 0)',
        },
        config: activeConfig,
        immediate,
      });
    }
  }, [
    ACTIVE_VOTING_COLOR,
    DEFAULT_BG_COLOR,
    TELEVOTE_COUNTRY_TEXT_COLOR,
    FINISHED_VOTING_COLOR,
    apiActive,
    isActive,
    isCountryVotingFinished,
    isJuryVoting,
    UNFINISHED_TELEVOTE_TEXT_COLOR,
    isFinalAnimationFinished,
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
