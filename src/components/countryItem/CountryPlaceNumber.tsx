import React, { useEffect, useMemo } from 'react';

import { animated, easings, useSpring } from '@react-spring/web';

import { useScoreboardStore } from '../../state/scoreboardStore';

const config = { duration: 300, easing: easings.easeInOutCubic };

type Props = {
  shouldShowAsNonQualified: boolean;
  index: number;
  showPlaceAnimation: boolean;
};

const CountryPlaceNumber = ({
  shouldShowAsNonQualified,
  index,
  showPlaceAnimation,
}: Props) => {
  const { getCurrentStage, canDisplayPlaceAnimation } = useScoreboardStore();

  const { isOver: isVotingOver } = getCurrentStage();

  // Calculate width dynamically to handle different screen sizes
  const width = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 576 ? 40 : 32;
    }

    return 40; // fallback
  }, []);

  const [springsPlaceContainer, apiPlaceContainer] = useSpring(() => ({
    from: {
      width: showPlaceAnimation ? width : 0,
      transform: 'translate3d(0, 0, 0)',
    },
    config,
  }));

  const [springsPlaceText, apiPlaceText] = useSpring(() => ({
    from: {
      opacity: showPlaceAnimation ? 1 : 0,
      transform: 'translate3d(0, 0, 0)',
    },
    config,
  }));

  useEffect(() => {
    if (!canDisplayPlaceAnimation || !showPlaceAnimation) return;

    if (isVotingOver) {
      apiPlaceContainer.start({
        to: { width, transform: 'translate3d(0, 0, 0)' },
      });

      apiPlaceText.start({
        to: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      });
    } else {
      apiPlaceContainer.start({
        to: { width: 0, transform: 'translate3d(0, 0, 0)' },
      });

      apiPlaceText.start({
        to: { opacity: 0, transform: 'translate3d(0, 0, 0)' },
      });
    }
  }, [
    apiPlaceContainer,
    apiPlaceText,
    isVotingOver,
    showPlaceAnimation,
    canDisplayPlaceAnimation,
    width,
  ]);

  const placeText = index + 1 < 10 ? `0${index + 1}` : index + 1;

  if (!showPlaceAnimation) {
    return null;
  }

  return (
    <animated.div
      style={springsPlaceContainer}
      className={`flex flex-none items-center justify-center lg:h-10 md:h-9 xs:h-8 h-7 rounded-sm bg-countryItem-placeContainerBg text-countryItem-placeText ${
        shouldShowAsNonQualified ? 'bg-primary-900 opacity-70' : ''
      }`}
    >
      <animated.h4
        style={springsPlaceText}
        className="font-semibold md:text-lg text-base"
      >
        {placeText}
      </animated.h4>
    </animated.div>
  );
};

export default CountryPlaceNumber;
