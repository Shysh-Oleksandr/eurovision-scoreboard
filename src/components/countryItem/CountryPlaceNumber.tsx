'use client';
import gsap from 'gsap';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import usePrevious from '@/hooks/usePrevious';
import { useGeneralStore } from '@/state/generalStore';

type Props = {
  shouldShowAsNonQualified: boolean;
  index: number;
  showPlaceAnimation: boolean;
  points: number;
  isJuryVoting: boolean;
  size?: 'scoreboard' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
};

const CountryPlaceNumber = ({
  shouldShowAsNonQualified,
  index,
  showPlaceAnimation,
  points,
  isJuryVoting,
  size = 'scoreboard',
}: Props) => {
  const isSmallScreen = useMediaQuery('(max-width: 479px)');
  const isTablet = useMediaQuery('(min-width: 576px)');

  const showRankChangeIndicator = useGeneralStore(
    (state) => state.settings.showRankChangeIndicator,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  const [displayArrow, setDisplayArrow] = useState(false);

  const previousIndex = usePrevious(index);
  const previousDisplayArrow = usePrevious(displayArrow);

  const isScoreboard = size === 'scoreboard';

  // Size-based styles
  const sizeStyles = {
    scoreboard: {
      container: 'lg:h-10 md:h-9 xs:h-8 h-7',
      text: 'md:text-lg xs:text-base text-sm',
    },
    sm: {
      container: 'h-7 w-9 mr-1',
      text: 'text-sm',
    },
    md: {
      container: 'h-8 w-10 mr-1',
      text: 'text-sm',
    },
    lg: {
      container: 'h-10 w-12 mr-[6px]',
      text: 'text-lg',
    },
    xl: {
      container: 'h-12 w-[48px] mr-[6px]',
      text: 'text-xl',
    },
    '2xl': {
      container: 'h-14 w-16 mr-2',
      text: 'text-2xl',
    },
  };

  const currentSize = sizeStyles[size];

  // Calculate width dynamically to handle different screen sizes
  const width = useMemo(() => {
    if (typeof window !== 'undefined') {
      const mobileWidth = isSmallScreen ? 28 : 32;

      return isTablet ? 40 : mobileWidth;
    }

    return 40; // fallback
  }, [isSmallScreen, isTablet]);

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
      if (showPlaceAnimation && isScoreboard) {
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
      className={`flex flex-none items-center justify-center rounded-sm bg-countryItem-placeContainerBg text-countryItem-placeText relative ${
        currentSize.container
      } ${
        shouldShowAsNonQualified
          ? 'bg-countryItem-unqualifiedBg opacity-70'
          : ''
      }`}
    >
      <ArrowIcon
        className={`text-countryItem-placeText -rotate-90 mb-0.5 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10 2cols:w-8 w-7 2cols:h-8 h-7 ${
          displayArrow ? 'blinker' : 'opacity-0'
        }`}
      />

      <h4
        ref={textRef}
        className={`font-semibold ${currentSize.text} ${
          displayArrow ? '!opacity-0' : ''
        } ${previousDisplayArrow && !displayArrow ? 'blinker' : ''}`}
      >
        {placeText}
      </h4>
    </div>
  );
};

export default CountryPlaceNumber;
