import { CountUp } from 'countup.js';
import React, { useEffect, useMemo, useRef } from 'react';

import { BaseCountry, Country } from '../../models';
import RoundedTriangle from '../RoundedTriangle';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { PointsContainerShape } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

export interface PointsSectionProps {
  country: Country | BaseCountry;
  pointsContainerShape?: PointsContainerShape;
  pointsBgClass: string;
  pointsContainerClassName?: string;
  pointsTextClass: string;
  shouldShowNQLabel: boolean;
  showLastPoints?: boolean;
  lastPointsBgClass?: string;
  lastPointsTextClass?: string;
  lastPointsRef?: React.RefObject<HTMLDivElement | null>;
  lastPointsContainerRef?: React.RefObject<HTMLDivElement | null>;
  triangleClassName?: string;
  isTwoColumnLayout?: boolean;
  usePointsCountUpAnimationOverride?: boolean;
}

const PointsSection: React.FC<PointsSectionProps> = ({
  country,
  pointsContainerShape = 'triangle',
  pointsBgClass,
  pointsContainerClassName,
  pointsTextClass,
  shouldShowNQLabel,
  showLastPoints = false,
  lastPointsBgClass,
  lastPointsTextClass,
  lastPointsRef,
  lastPointsContainerRef,
  triangleClassName,
  isTwoColumnLayout = false,
  usePointsCountUpAnimationOverride,
}) => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const isLastSimulationAnimationFinished = useScoreboardStore(
    (state) => state.isLastSimulationAnimationFinished,
  );
  const { usePointsCountUpAnimation } = useThemeSpecifics();

  const withTriangle = pointsContainerShape === 'triangle';
  const isTransparent = pointsContainerShape === 'transparent';
  const pointsRef = useRef<HTMLHeadingElement | null>(null);
  const previousPointsRef = useRef<number | null>(null);
  const currentPoints = useMemo(() => {
    return 'points' in country ? toFixedIfDecimalFloat(country.points) : 0;
  }, [country]);

  useEffect(() => {
    if (!pointsRef.current || shouldShowNQLabel) {
      previousPointsRef.current = currentPoints;

      return;
    }

    const startVal = previousPointsRef.current ?? currentPoints;
    const shouldUsePointsCountUpAnimation =
      usePointsCountUpAnimationOverride ?? usePointsCountUpAnimation;
    const shouldDisableAnimation =
      !shouldUsePointsCountUpAnimation ||
      (winnerCountry && isLastSimulationAnimationFinished);
    const countUp = new CountUp(pointsRef.current, currentPoints, {
      startVal,
      duration: shouldDisableAnimation ? 0 : 0.8,
      useGrouping: false,
      formattingFn: (value) => String(toFixedIfDecimalFloat(value)),
    });

    if (countUp.error) {
      pointsRef.current.textContent = String(currentPoints);
      previousPointsRef.current = currentPoints;

      return;
    }

    if (startVal === currentPoints) {
      pointsRef.current.textContent = String(currentPoints);
      previousPointsRef.current = currentPoints;

      return;
    }

    countUp.start(() => {
      previousPointsRef.current = currentPoints;
    });
  }, [
    currentPoints,
    winnerCountry,
    isLastSimulationAnimationFinished,
    usePointsCountUpAnimation,
    usePointsCountUpAnimationOverride,
    shouldShowNQLabel,
  ]);

  return (
    <>
      {/* Last points */}
      {showLastPoints && (
        <div
          ref={lastPointsContainerRef}
          className={`absolute z-10 h-full will-change-all transition-colors !duration-500 ${
            withTriangle
              ? `pr-[0.5rem] lg:right-[2.4rem] lg:w-[2.5rem] ${
                  isTwoColumnLayout
                    ? 'xs:w-8 w-6 xs:right-8 right-6'
                    : 'w-8 right-8'
                }`
              : `lg:right-[2.9rem] lg:w-[2.9rem] ${
                  isTwoColumnLayout
                    ? 'xs:w-9 w-7 xs:right-9 right-7'
                    : 'w-9 right-9'
                }`
          } ${lastPointsBgClass} ${isTransparent ? '!bg-transparent' : ''}`}
        >
          {withTriangle && (
            <RoundedTriangle
              className={`${lastPointsBgClass} !z-[-1] ${triangleClassName}`}
            />
          )}
          <h6
            ref={lastPointsRef}
            className={`xl:text-lg lg:text-base ${
              isTwoColumnLayout ? 'xs:text-sm text-xs' : 'text-sm'
            } font-semibold h-full items-center flex justify-center will-change-all !z-[40] relative ${lastPointsTextClass}`}
          >
            {'lastReceivedPoints' in country
              ? toFixedIfDecimalFloat(country.lastReceivedPoints ?? 0)
              : 0}
          </h6>
        </div>
      )}

      {/* Points */}
      <div
        className={`${showLastPoints ? 'absolute right-0 top-0' : 'relative'} ${
          withTriangle
            ? `pr-1 lg:w-[2.4rem] ${isTwoColumnLayout ? 'xs:w-8 w-6' : 'w-8'}`
            : `lg:w-[2.9rem] ${isTwoColumnLayout ? 'xs:w-9 w-7' : 'w-9'}`
        } h-full z-20 transition-colors !duration-500 ${pointsBgClass} ${pointsContainerClassName} ${
          isTransparent ? '!bg-transparent' : ''
        }`}
      >
        {withTriangle && (
          <RoundedTriangle
            className={`${pointsBgClass} !z-[-1] ${triangleClassName}`}
          />
        )}
        <h6
          ref={pointsRef}
          className={`xl:text-lg lg:text-base ${
            isTwoColumnLayout ? 'xs:text-sm text-xs' : 'text-sm'
          } font-semibold h-full items-center flex justify-center !z-[40] relative ${pointsTextClass}`}
        >
          {shouldShowNQLabel ? 'NQ' : currentPoints}
        </h6>
      </div>
    </>
  );
};

export default PointsSection;
