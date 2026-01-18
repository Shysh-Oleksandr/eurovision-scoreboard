'use client';
import React, { useRef } from 'react';

import { getFlagPath } from '../../helpers/getFlagPath';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import RoundedTriangle from '../RoundedTriangle';

import CountryItemBase from './CountryItemBase';
import CountryPlaceNumber from './CountryPlaceNumber';
import DouzePointsAnimation from './DouzePointsAnimation';
import { useCountryItemColors } from './hooks/useCountryItemColors';
import useDouzePointsAnimation from './hooks/useDouzePointsAnimation';
import { useItemState } from './hooks/useItemState';
import { useQualificationStatus } from './hooks/useQualificationStatus';
import useVotingFinished from './hooks/useVotingFinished';

import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import { SENTINEL } from '@/data/data';
import { ScoreboardMobileLayout, useGeneralStore } from '@/state/generalStore';
import { ItemState } from '@/theme/types';

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

  const scoreboardMobileLayout = useGeneralStore(
    (s) => s.presentationSettings.scoreboardMobileLayout,
  );
  const isTwoColumnLayout =
    scoreboardMobileLayout === ScoreboardMobileLayout.TWO_COLUMN;

  const shouldShowPlaceNumber = alwaysShowRankings || showPlaceAnimation;

  const currentStage = getCurrentStage();
  const isJuryVoting = !!currentStage?.isJuryVoting;
  const isVotingOver = !!currentStage?.isOver;

  const isVotingFinished = useVotingFinished(
    !!country.isVotingFinished,
    !!isVotingOver,
  );

  const { shouldRender: showDouzePointsAnimationHook, points: douzePoints } =
    useDouzePointsAnimation(
      !!country.showDouzePointsAnimation,
      country.code,
      country.lastReceivedPoints,
    );

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

  const { shouldShowAsNonQualified, shouldShowNQLabel } =
    useQualificationStatus(country, !!isVotingOver);
  const { isDisabled, buttonClassName, isActive } = useItemState({
    country,
    votingCountryCode,
    isJuryVoting,
    showPlaceAnimation: shouldShowPlaceNumber,
    shouldShowAsNonQualified,
    hasCountryFinishedVoting,
    isCountryVotingFinished: !!country.isVotingFinished,
    isVotingOver,
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
    isUnqualified: shouldShowAsNonQualified,
  });

  const { lastPointsContainerRef, lastPointsTextRef } = useAnimatePoints({
    shouldShowLastPoints:
      country.lastReceivedPoints !== null && !isVotingFinished,
    isDouzePoints: !!country.showDouzePointsAnimation,
    douzePointsRefs,
  });

  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const buttonSpecialStyle = getSpecialBackgroundStyle(
    buttonClassName,
    overrides,
  );

  return (
    <CountryItemBase
      country={country}
      index={index}
      className={isVotingOver ? '' : 'md:~md/xl:~w-[14rem]/[26rem]'}
      containerClassName={`${buttonClassName} flex-1 min-w-0 overflow-hidden`}
      style={buttonSpecialStyle}
      disabled={isDisabled}
      onClick={onClick}
      as="button"
      showPlaceNumber={shouldShowPlaceNumber}
      renderPlaceNumber={(country, index) => {
        // Determine the current state for rank colors
        let currentState: ItemState = 'televoteUnfinished';

        if (shouldShowAsNonQualified) {
          currentState = 'unqualified';
        } else if (isJuryVoting) {
          currentState = 'jury';
        } else if (isActive) {
          currentState = 'televoteActive';
        } else if (isVotingFinished) {
          currentState = 'televoteFinished';
        } else {
          currentState = 'televoteUnfinished';
        }

        return (
          <CountryPlaceNumber
            shouldShowAsNonQualified={shouldShowAsNonQualified}
            index={index}
            showPlaceAnimation={shouldShowPlaceNumber}
            points={'points' in country ? country.points : 0}
            isJuryVoting={isJuryVoting}
            state={currentState}
          />
        );
      }}
      renderDouzePointsAnimation={() =>
        showDouzePointsAnimationHook ? (
          <DouzePointsAnimation
            refs={{
              containerRef: douzePointsContainerRef,
              parallelogramBlueRef: douzePointsParallelogramBlueRef,
              parallelogramYellowRef: douzePointsParallelogramYellowRef,
            }}
            pointsAmount={douzePoints ?? 0}
            overrides={overrides}
          />
        ) : null
      }
      renderFlag={() => (
        <img
          src={getFlagPath(country)}
          onError={(e) => {
            e.currentTarget.src = getFlagPath('ww');
          }}
          alt={`${country.name} flag`}
          width={48}
          height={36}
          loading="lazy"
          className="lg:w-[50px] md:w-12 xs:w-10 w-8 lg:h-10 md:h-9 xs:h-8 h-7 bg-countryItem-juryBg self-start lg:min-w-[50px] md:min-w-[48px] xs:min-w-[40px] min-w-[32px] object-cover"
        />
      )}
      renderName={() => (
        <h4
          className={`uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] truncate flex-1 lg:mr-[2.57rem] md:mr-9 mr-8`}
        >
          {country.name}
        </h4>
      )}
      renderPoints={() => (
        <>
          {/* Last points */}
          <div
            ref={lastPointsContainerRef}
            style={{
              display:
                country.lastReceivedPoints === SENTINEL ? 'none' : 'block',
            }}
            className={`absolute lg:right-10 md:right-9 ${
              isTwoColumnLayout ? 'xs:right-8 right-6' : 'right-8'
            } z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 ${
              isTwoColumnLayout ? 'xs:w-8 w-6' : 'w-8'
            } will-change-all ${lastPointsBgClass}`}
          >
            <RoundedTriangle
              className={`${lastPointsBgClass} !z-[-1]`}
              withTransition={false}
            />
            <h6
              ref={lastPointsTextRef}
              className={`lg:text-lg md:text-sm text-xs font-semibold h-full items-center flex justify-center will-change-all !z-[40] relative ${lastPointsTextClass}`}
            >
              {country.lastReceivedPoints}
            </h6>
          </div>

          {/* Points */}
          <div
            className={`absolute right-0 top-0 h-full z-20 pr-1 lg:w-[2.57rem] md:w-9 ${
              isTwoColumnLayout ? 'xs:w-8 w-6' : 'w-8'
            } transition-colors !duration-500 ${pointsBgClass}`}
          >
            <RoundedTriangle className={`${pointsBgClass}`} />
            <h6
              className={`lg:text-lg sm:text-[0.85rem] xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center !z-[40] relative ${pointsTextClass}`}
            >
              {shouldShowNQLabel ? 'NQ' : country.points}
            </h6>
          </div>
        </>
      )}
      {...props}
    />
  );
};

export default React.memo(CountryItem);
