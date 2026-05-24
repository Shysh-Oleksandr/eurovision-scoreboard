import { CountUp } from 'countup.js';
import gsap from 'gsap';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { BaseCountry, Country } from '../../models';
import RoundedTriangle from '../RoundedTriangle';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useScoreboardTwoColumnCompactLayout } from '@/hooks/useScoreboardTwoColumnCompactLayout';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { PointsContainerShape } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

/* 
box-shadow: 1px 0px 7px 3px #8ba8d4b8;
box-shadow: 6px 0px 7px 3px #0a0a0aa1;
box-shadow: inset 0 -0.1px 1px 0.3px #dfe2ebc9, var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow), 0 0 10px 5px #48abe0;
*/

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
  /** Rounded pill layout: current points then last points on the right; last slot always reserves width. */
  roundedCountryLayout?: boolean;
  /**
   * When `roundedCountryLayout` + `showLastPoints`: if false, the reserved last column is transparent
   * and the current points block gets a fully rounded right edge.
   */
  lastReceivedPointsActive?: boolean;
  isFinished?: boolean;
  /** Bumps on theme/layout change to clear stale GSAP transforms on the points row. */
  pointsLayoutKey?: string;
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
  roundedCountryLayout = false,
  lastReceivedPointsActive,
  isFinished,
  pointsLayoutKey = '',
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
  const roundedPointsRowRef = useRef<HTMLDivElement | null>(null);
  const roundedPointsTrackRef = useRef<HTMLDivElement | null>(null);
  const currentPoints = useMemo(() => {
    return 'points' in country ? toFixedIfDecimalFloat(country.points) : 0;
  }, [country]);

  const isTwoColumnLayoutDisplayed =
    useScoreboardTwoColumnCompactLayout(isTwoColumnLayout);

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
    const decimalPlaces = (currentPoints.toString().split('.')[1] ?? '').length;
    const countUp = new CountUp(pointsRef.current, currentPoints, {
      startVal,
      duration: shouldDisableAnimation ? 0 : 0.6,
      useGrouping: false,
      decimalPlaces,
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
    roundedCountryLayout,
    pointsContainerShape,
  ]);

  useLayoutEffect(() => {
    if (!pointsLayoutKey) return;

    const targets = [
      roundedPointsRowRef.current,
      roundedPointsTrackRef.current,
      lastPointsContainerRef?.current,
      lastPointsRef?.current,
    ].filter(Boolean) as HTMLElement[];

    if (targets.length === 0) return;

    gsap.killTweensOf(targets);
    gsap.set(targets, { clearProps: 'all' });
  }, [pointsLayoutKey, lastPointsContainerRef, lastPointsRef]);

  useLayoutEffect(() => {
    if (!pointsRef.current || shouldShowNQLabel || !pointsLayoutKey) return;

    pointsRef.current.textContent = String(currentPoints);
    previousPointsRef.current = currentPoints;
  }, [pointsLayoutKey, currentPoints, shouldShowNQLabel]);

  const lastPointsLabel =
    'lastReceivedPoints' in country && country.lastReceivedPoints !== null
      ? toFixedIfDecimalFloat(country.lastReceivedPoints)
      : '';

  const resolvedLastReceivedActive =
    lastReceivedPointsActive !== undefined
      ? lastReceivedPointsActive
      : lastPointsLabel !== '' && showLastPoints;

  if (roundedCountryLayout) {
    const roundedLastPointsBlockClass = `flex h-full shrink-0 will-change-all ${
      isTwoColumnLayoutDisplayed
        ? 'pl-[23px] pr-[15px] w-9 -ml-[0.95rem]'
        : 'pr-[16px] pl-[24px] md:pr-[18px] md:pl-[26px] w-9 lg:pr-[24px] lg:pl-[32px] lg:w-10 -ml-3.5 lg:-ml-4'
    }`;

    const roundedCurrentPointsBlockClass = `flex h-full shrink-0 will-change-all ${
      isTwoColumnLayoutDisplayed
        ? 'pl-0.5 w-[2.8rem]'
        : 'pl-1 md:w-[3.2rem] w-[3.35rem] lg:pl-2 lg:w-[4.4rem]'
    }`;

    const roundedPointsTrackWidthClass = isTwoColumnLayoutDisplayed
      ? 'w-[calc(2.2rem+2.8rem-0.4rem)] shrink-0'
      : 'md:w-[calc(3.2rem+2.75rem-0.45rem)] w-[calc(3.35rem+2.5rem-0.45rem)] shrink-0 lg:w-[calc(4.2rem+4rem-0.45rem)]';

    const roundedPointsTextClass = isTwoColumnLayoutDisplayed
      ? 'text-xs'
      : 'text-sm md:text-base lg:text-lg';

    const roundedRowClass = `relative z-[15] -ml-2 flex h-full flex-shrink-0 flex-row items-stretch md:-ml-3 lg:-ml-4 -ml-3.5 ${
      pointsContainerClassName ?? ''
    }`;

    const currentBlock = (
      <div
        className={`${roundedCurrentPointsBlockClass} relative z-[23] rounded-full rounded-l-none overflow-hidden transition-all !duration-500 ${pointsBgClass} ${
          isTransparent ? '!bg-transparent' : ''
        }`}
        style={
          resolvedLastReceivedActive
            ? { boxShadow: '5px 0px 10px 0px rgb(162 193 239 / 55%)' }
            : undefined
        }
      >
        {/* Shadow layer extends left; overflow-hidden clips that protrusion, hiding the shadow's left edge */}
        <div
          className="pointer-events-none absolute inset-0 -left-[6px] rounded-full rounded-l-none z-[1]"
          aria-hidden="true"
          style={{ boxShadow: 'inset 0 -0.1px 1px 0.3px #dfe2ebc9' }}
        />
        <h6
          ref={pointsRef}
          className={`w-full pr-0.5 pl-2 ${roundedPointsTextClass} h-full items-center flex justify-center !z-[40] relative tabular-nums ${pointsTextClass} ${
            isFinished ? 'font-semibold' : ''
          }`}
        >
          {shouldShowNQLabel ? 'NQ' : currentPoints}
        </h6>
      </div>
    );

    if (!showLastPoints) {
      return (
        <div ref={roundedPointsRowRef} className={roundedRowClass}>
          {currentBlock}
        </div>
      );
    }

    const lastColumnBg = resolvedLastReceivedActive
      ? `${lastPointsBgClass} ${isTransparent ? '!bg-transparent' : ''}`
      : '!bg-transparent';

    return (
      <div ref={roundedPointsRowRef} className={roundedRowClass}>
        <div
          ref={roundedPointsTrackRef}
          className={`flex h-full flex-row items-stretch overflow-visible ${roundedPointsTrackWidthClass}`}
        >
          {currentBlock}

          <div
            ref={lastPointsContainerRef}
            className={`${roundedLastPointsBlockClass} relative z-[20] overflow-hidden rounded-r-full transition-colors !duration-500 justify-center ${lastColumnBg} ${
              resolvedLastReceivedActive ? '' : 'pointer-events-none'
            }`}
          >
            {/* Shadow matches the container shape exactly so it follows the curved right edge without clipping */}
            {resolvedLastReceivedActive && (
              <div
                className="pointer-events-none absolute inset-0 rounded-r-full z-[1]"
                aria-hidden="true"
                style={{ boxShadow: 'inset 0 -0.1px 1px 0.3px #dfe2ebc9' }}
              />
            )}
            <h6
              ref={lastPointsRef}
              className={`${roundedPointsTextClass} h-full items-center flex justify-center will-change-all !z-[40] relative tabular-nums ${lastPointsTextClass}`}
            >
              {lastPointsLabel}
            </h6>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Last points */}
      {showLastPoints && (
        <div
          ref={lastPointsContainerRef}
          className={`absolute z-10 h-full will-change-all transition-colors !duration-500 ${
            withTriangle
              ? `pr-[0.5rem] lg:right-[2.4rem] lg:w-[2.5rem] ${
                  isTwoColumnLayoutDisplayed
                    ? 'xs:w-8 w-6 xs:right-8 right-6'
                    : 'w-8 right-8'
                }`
              : `lg:right-[2.9rem] lg:w-[2.9rem] ${
                  isTwoColumnLayoutDisplayed
                    ? 'xs:w-9 w-7 xs:right-9 right-7'
                    : 'w-9 right-9'
                }`
          } ${lastPointsBgClass} ${isTransparent ? '!bg-transparent' : ''}`}
        >
          {withTriangle && (
            <RoundedTriangle
              className={`${lastPointsBgClass} ${triangleClassName} !z-[-1]`}
            />
          )}
          <h6
            ref={lastPointsRef}
            className={`xl:text-lg lg:text-base ${
              isTwoColumnLayoutDisplayed ? 'xs:text-sm text-xs' : 'text-sm'
            } font-semibold h-full items-center flex justify-center will-change-all !z-[40] relative ${lastPointsTextClass}`}
          >
            {lastPointsLabel}
          </h6>
        </div>
      )}

      {/* Points */}
      <div
        className={`${showLastPoints ? 'absolute right-0 top-0' : 'relative'} ${
          withTriangle
            ? `pr-1 lg:w-[2.4rem] ${
                isTwoColumnLayoutDisplayed ? 'xs:w-8 w-6' : 'w-8'
              }`
            : `lg:w-[2.9rem] ${
                isTwoColumnLayoutDisplayed ? 'xs:w-9 w-7' : 'w-9'
              }`
        } h-full z-20 transition-colors !duration-500 ${pointsBgClass} ${pointsContainerClassName} ${
          isTransparent ? '!bg-transparent' : ''
        }`}
      >
        {withTriangle && (
          <RoundedTriangle
            className={`${pointsBgClass} ${triangleClassName} !z-[1]`}
          />
        )}
        <h6
          ref={pointsRef}
          className={`xl:text-lg lg:text-base ${
            isTwoColumnLayoutDisplayed ? 'xs:text-sm text-xs' : 'text-sm'
          } font-semibold h-full items-center flex justify-center !z-[40] relative ${pointsTextClass}`}
        >
          {shouldShowNQLabel ? 'NQ' : currentPoints}
        </h6>
      </div>
    </>
  );
};

export default PointsSection;
