'use client';
import React, { useRef } from 'react';

import { getFlagPath, handleFlagError } from '../../helpers/getFlagPath';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';

import CountryItemBase from './CountryItemBase';
import CountryPlaceNumber from './CountryPlaceNumber';
import DouzePointsAnimation from './DouzePointsAnimation';
import { useCountryItemColors } from './hooks/useCountryItemColors';
import useDouzePointsAnimation from './hooks/useDouzePointsAnimation';
import useFlagClassName from './hooks/useFlagClassName';
import { useItemState } from './hooks/useItemState';
import { useQualificationStatus } from './hooks/useQualificationStatus';
import useVotingFinished from './hooks/useVotingFinished';
import PointsSection from './PointsSection';

import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
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
  const uppercaseEntryName = useGeneralStore(
    (s) => s.customTheme?.uppercaseEntryName ?? true,
  );
  const flagShape = useGeneralStore(
    (s) => s.customTheme?.flagShape ?? 'big-rectangle',
  );
  const pointsContainerShape = useGeneralStore(
    (s) => s.customTheme?.pointsContainerShape ?? 'triangle',
  );
  const buttonSpecialStyle = getSpecialBackgroundStyle(
    buttonClassName,
    overrides,
  );

  const flagClassName = useFlagClassName(flagShape);

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
      renderFlag={
        flagShape !== 'none'
          ? () => (
              <img
                src={getFlagPath(country, flagShape)}
                onError={(e) =>
                  handleFlagError(e.currentTarget, country, flagShape)
                }
                alt={`${country.name} flag`}
                width={48}
                height={36}
                loading="lazy"
                className={`object-cover bg-countryItem-juryBg ${flagClassName}`}
              />
            )
          : undefined
      }
      renderName={() => (
        <h4
          className={`${uppercaseEntryName ? 'uppercase' : ''} text-left ${
            isTwoColumnLayout
              ? 'xs:ml-2 ml-1.5 text-[0.8rem]'
              : 'ml-2 text-[0.9rem]'
          } font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm truncate flex-1 lg:mr-[2.57rem] md:mr-9 mr-8`}
        >
          {country.name}
        </h4>
      )}
      renderPoints={(country) => (
        <PointsSection
          country={country}
          pointsBgClass={pointsBgClass}
          pointsTextClass={pointsTextClass}
          shouldShowNQLabel={shouldShowNQLabel}
          showLastPoints={true}
          lastPointsBgClass={lastPointsBgClass}
          lastPointsTextClass={lastPointsTextClass}
          lastPointsRef={lastPointsTextRef}
          isTwoColumnLayout={isTwoColumnLayout}
          lastPointsContainerRef={lastPointsContainerRef}
          pointsContainerShape={pointsContainerShape}
        />
      )}
      {...props}
    />
  );
};

export default React.memo(CountryItem);
