import React from 'react';

import { BaseCountry, Country } from '../../models';
import RoundedTriangle from '../RoundedTriangle';

import { PointsContainerShape } from '@/theme/types';

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
}) => {
  const withTriangle = pointsContainerShape === 'triangle';
  const isTransparent = pointsContainerShape === 'transparent';

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
            {'lastReceivedPoints' in country ? country.lastReceivedPoints : 0}
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
          className={`xl:text-lg lg:text-base ${
            isTwoColumnLayout ? 'xs:text-sm text-xs' : 'text-sm'
          } font-semibold h-full items-center flex justify-center !z-[40] relative ${pointsTextClass}`}
        >
          {shouldShowNQLabel ? 'NQ' : 'points' in country ? country.points : 0}
        </h6>
      </div>
    </>
  );
};

export default PointsSection;
