import React, { useRef } from 'react';

import { getFlagPath } from '../../helpers/getFlagPath';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import RoundedTriangle from '../RoundedTriangle';

import CountryPlaceNumber from './CountryPlaceNumber';
import DouzePointsAnimation from './DouzePointsAnimation';
import { useCountryItemColors } from './hooks/useCountryItemColors';
import useDouzePointsAnimation from './hooks/useDouzePointsAnimation';
import { useItemState } from './hooks/useItemState';
import { useQualificationStatus } from './hooks/useQualificationStatus';
import useVotingFinished from './hooks/useVotingFinished';

import { useGeneralStore } from '@/state/generalStore';

type Props = {
  country: Country;
  index: number;
  votingCountryCode?: string;
  onClick: (countryCode: string) => void;
  showPlaceAnimation: boolean;
  hasCountryFinishedVoting: boolean;
};

const CountryItem = ({
  country,
  index,
  votingCountryCode,
  onClick,
  showPlaceAnimation,
  hasCountryFinishedVoting,
  ...props
}: Props) => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const alwaysShowRankings = useGeneralStore(
    (state) => state.settings.alwaysShowRankings,
  );

  const shouldShowPlaceNumber = alwaysShowRankings || showPlaceAnimation;

  const { isJuryVoting, isOver: isVotingOver } = getCurrentStage();

  const isVotingFinished = useVotingFinished(
    !!country.isVotingFinished,
    isVotingOver,
  );

  const isDouzePoints =
    !country.televotePoints && country.lastReceivedPoints === 12;
  const showDouzePointsAnimationHook = useDouzePointsAnimation(isDouzePoints);

  const douzePointsContainerRef = useRef<HTMLDivElement>(null);
  const douzePointsParallelogramBlueRef = useRef<HTMLDivElement>(null);
  const douzePointsParallelogramYellowRef = useRef<HTMLDivElement>(null);

  const douzePointsRefs = showDouzePointsAnimationHook
    ? {
        containerRef: douzePointsContainerRef,
        parallelogramBlueRef: douzePointsParallelogramBlueRef,
        parallelogramYellowRef: douzePointsParallelogramYellowRef,
      }
    : null;

  const shouldShowAsNonQualified = useQualificationStatus(
    country,
    isVotingOver,
  );
  const { isDisabled, buttonClassName, isActive } = useItemState({
    country,
    votingCountryCode,
    isJuryVoting,
    showPlaceAnimation: shouldShowPlaceNumber,
    shouldShowAsNonQualified,
    hasCountryFinishedVoting,
    isCountryVotingFinished: !!country.isVotingFinished,
  });

  const {
    pointsBgClass,
    pointsTextClass,
    lastPointsBgClass,
    lastPointsTextClass,
  } = useCountryItemColors({
    isJuryVoting,
    isCountryVotingFinished: !!country.isVotingFinished,
    isActive,
  });

  const { lastPointsContainerRef, lastPointsTextRef } = useAnimatePoints({
    shouldShowLastPoints:
      country.lastReceivedPoints !== null && !isVotingFinished,
    isDouzePoints,
    douzePointsRefs,
  });

  return (
    <div
      className={`flex relative ${
        isVotingOver ? '' : 'md:~md/xl:~w-[14rem]/[26rem]'
      }`}
      {...props}
    >
      <CountryPlaceNumber
        shouldShowAsNonQualified={shouldShowAsNonQualified}
        index={index}
        showPlaceAnimation={shouldShowPlaceNumber}
        points={country.points}
        isJuryVoting={isJuryVoting}
      />

      <button
        className={`${buttonClassName} flex-1 min-w-0 overflow-hidden`}
        disabled={isDisabled}
        onClick={() => onClick(country.code)}
      >
        {showDouzePointsAnimationHook && (
          <DouzePointsAnimation
            refs={{
              containerRef: douzePointsContainerRef,
              parallelogramBlueRef: douzePointsParallelogramBlueRef,
              parallelogramYellowRef: douzePointsParallelogramYellowRef,
            }}
          />
        )}

        <div className="flex items-center overflow-hidden flex-1">
          <img
            loading="lazy"
            src={getFlagPath(country)}
            onError={(e) => {
              e.currentTarget.src = getFlagPath('ww');
            }}
            alt={`${country.name} flag`}
            width={48}
            height={36}
            className="lg:w-[50px] md:w-12 xs:w-10 w-8 lg:h-10 md:h-9 xs:h-8 h-7 bg-countryItem-juryBg self-start lg:min-w-[50px] md:min-w-[48px] xs:min-w-[40px] min-w-[32px] object-cover"
          />
          <h4
            className={`uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] truncate flex-1 min-w-[7rem] sm:min-w-[9rem] md:min-w-0 2cols:max-w-[11rem] sm:max-w-[9rem] xs:max-w-[20rem] 2xs:max-w-[14.7rem] max-w-[11rem] md:max-w-full`}
          >
            {country.name}
          </h4>
        </div>
        <div className="flex h-full flex-shrink-0">
          {/* Last points */}
          <div
            ref={lastPointsContainerRef}
            style={{
              display: country.lastReceivedPoints === -1 ? 'none' : 'block',
            }}
            className={`absolute lg:right-10 md:right-9 right-8 z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 w-8 will-change-all ${lastPointsBgClass}`}
          >
            <RoundedTriangle
              className={lastPointsBgClass}
              withTransition={false}
            />
            <h6
              ref={lastPointsTextRef}
              className={`lg:text-lg md:text-sm text-xs font-semibold h-full items-center flex justify-center will-change-all ${lastPointsTextClass}`}
            >
              {country.lastReceivedPoints}
            </h6>
          </div>

          {/* Points */}
          <div
            className={`relative h-full z-20 lg:w-[2.57rem] pr-1 md:w-9 w-8 transition-colors !duration-500 ${pointsBgClass}`}
          >
            <RoundedTriangle className={pointsBgClass} />
            <h6
              className={`lg:text-lg sm:text-[0.85rem] xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center ${pointsTextClass}`}
            >
              {country.points === -1 ? 'NQ' : country.points}
            </h6>
          </div>
        </div>
      </button>
    </div>
  );
};

export default React.memo(CountryItem);
