import { useEffect, useMemo, useRef } from 'react';

import { SpringValue, easings, useSpring } from '@react-spring/web';

import { useScoreboardStore } from '../state/scoreboardStore';
import { useThemeColor } from '../theme/useThemeColor';

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
  springsPlaceContainer: {
    width: SpringValue<number>;
  };
  springsPlaceText: {
    opacity: SpringValue<number>;
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

  const [springsPlaceContainer, apiPlaceContainer] = useSpring(() => ({
    from: { width: 0 },
  }));

  const [springsPlaceText, apiPlaceText] = useSpring(() => ({
    from: { opacity: 0 },
  }));

  const parallelogramsAnimation = useMemo(
    () => ({
      from: {
        left: '-20%',
        transform: 'skewX(45deg)',
      },
      to: {
        left: '120%',
        transform: 'skewX(-45deg)',
      },
      config: { duration: 1000, easing: easings.easeInOutCubic },
    }),
    [],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    if (isDouzePoints) {
      apiDouzeContainer.start({
        from: { opacity: 0 },
        to: { opacity: 1 },
        delay: 200,
        config: { duration: 400, easing: easings.easeInOutCubic },
      });

      apiDouzeParallelogramBlue.start(parallelogramsAnimation);
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
    } else if (!isFinalAnimationFinished) {
      if (winnerCountry) {
        setTimeout(() => {
          setFinalAnimationFinished(true);
        }, 1000);
      }

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

    if (isVotingOver) {
      apiPlaceContainer.start({
        from: { width: 0 },
        to: { width: window.innerWidth > 576 ? 40 : 32 }, // 40px = w-10 (2.5rem)
        config: { duration: 300, easing: easings.easeInOutCubic },
      });

      apiPlaceText.start({
        from: { opacity: 0 },
        to: { opacity: 1 },
        config: { duration: 300, easing: easings.easeInOutCubic },
      });
    } else {
      apiPlaceContainer.start({
        from: { width: 40 },
        to: { width: 0 },
        config: { duration: 300, easing: easings.easeInOutCubic },
      });

      apiPlaceText.start({
        from: { opacity: 1 },
        to: { opacity: 0 },
        config: { duration: 300, easing: easings.easeInOutCubic },
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
    apiPlaceContainer,
    apiPlaceText,
    isDouzePoints,
    shouldShowLastPoints,
    isVotingOver,
    parallelogramsAnimation,
    setFinalAnimationFinished,
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
          color: TELEVOTE_COUNTRY_TEXT_COLOR,
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
      });
    } else if (isCountryVotingFinished) {
      apiActive.start({
        from: {
          outlineWidth: 2,
          backgroundColor: ACTIVE_VOTING_COLOR,
          color: TELEVOTE_COUNTRY_TEXT_COLOR,
        },
        to: {
          outlineWidth: 0,
          backgroundColor: FINISHED_VOTING_COLOR,
          color: TELEVOTE_COUNTRY_TEXT_COLOR,
        },
        config: { duration: 500, easing: easings.easeInOutCubic },
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
  ]);

  return useMemo(
    () => ({
      springsContainer,
      springsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsActive,
      springsPlaceContainer,
      springsPlaceText,
    }),
    [
      springsActive,
      springsContainer,
      springsDouzeContainer,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsText,
      springsPlaceContainer,
      springsPlaceText,
    ],
  );
};

export default useAnimatePoints;
