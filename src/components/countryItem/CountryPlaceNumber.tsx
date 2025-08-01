import gsap from 'gsap';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import usePrevious from '@/hooks/usePrevious';
import { useGeneralStore } from '@/state/generalStore';

type Props = {
  shouldShowAsNonQualified: boolean;
  index: number;
  showPlaceAnimation: boolean;
  points: number;
  isJuryVoting: boolean;
};

const CountryPlaceNumber = ({
  shouldShowAsNonQualified,
  index,
  showPlaceAnimation,
  points,
  isJuryVoting,
}: Props) => {
  const showRankChangeIndicator = useGeneralStore(
    (state) => state.settings.showRankChangeIndicator,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  const [displayArrow, setDisplayArrow] = useState(false);

  const previousIndex = usePrevious(index);
  const previousDisplayArrow = usePrevious(displayArrow);

  // Calculate width dynamically to handle different screen sizes
  const width = useMemo(() => {
    if (typeof window !== 'undefined') {
      const mobileWidth = window.innerWidth > 480 ? 32 : 28;

      return window.innerWidth > 576 ? 40 : mobileWidth;
    }

    return 40; // fallback
  }, []);

  useEffect(() => {
    if (points === 0 || !isJuryVoting || !showRankChangeIndicator) {
      setDisplayArrow(false);

      return;
    }

    if (
      previousIndex !== undefined &&
      previousIndex !== null &&
      index < previousIndex
    ) {
      setDisplayArrow(true);

      setTimeout(() => {
        setDisplayArrow(false);
      }, 1800);
    }
  }, [index, isJuryVoting, points, previousIndex, showRankChangeIndicator]);

  useGSAP(
    () => {
      if (showPlaceAnimation) {
        gsap.fromTo(
          containerRef.current,
          {
            width: 0,
          },
          {
            width,
            duration: 0.3,
            delay: 0.08,
            ease: 'power3.inOut',
          },
        );
        gsap.fromTo(
          textRef.current,
          {
            opacity: 0,
          },
          {
            opacity: 1,
            duration: 0.3,
            delay: 0.08,
            ease: 'power3.inOut',
          },
        );
      }
    },
    { dependencies: [showPlaceAnimation, width], scope: containerRef },
  );

  const placeText = index + 1 < 10 ? `0${index + 1}` : index + 1;

  if (!showPlaceAnimation) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-none items-center justify-center lg:h-10 md:h-9 xs:h-8 h-7 rounded-sm bg-countryItem-placeContainerBg text-countryItem-placeText relative ${
        shouldShowAsNonQualified ? 'bg-primary-900 opacity-70' : ''
      }`}
    >
      <ArrowIcon
        className={`text-white 2cols:w-8 w-7 2cols:h-8 h-7 -rotate-90 mb-0.5 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10 ${
          displayArrow ? 'blinker' : 'opacity-0'
        }`}
      />

      <h4
        ref={textRef}
        className={`font-semibold md:text-lg xs:text-base text-sm ${
          displayArrow ? '!opacity-0' : ''
        } ${previousDisplayArrow && !displayArrow ? 'blinker' : ''}`}
      >
        {placeText}
      </h4>
    </div>
  );
};

export default CountryPlaceNumber;
