'use client';
import React, { useMemo, useRef, useState } from 'react';

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
import {
  buildActiveTelevoteDropShadowFilter,
  resolveTelevoteOutlineColor,
  ROUNDED_GLOW_TRANSITION,
  ROUNDED_SUBTLE_GLOW,
  ROUNDED_SUBTLE_GLOW_HOVER,
  splitRoundedCountryItemSurfaceClasses,
} from '@/components/countryItem/utils/roundedCountryItemGlow';
import { useIsLowPerfDevice } from '@/hooks/useIsLowPerfDevice';
import { ScoreboardMobileLayout, useGeneralStore } from '@/state/generalStore';
import { ItemState } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

type Props = {
  country: Country;
  index: number;
  votingCountryCode?: string;
  onClick: (countryCode: string) => void;
  showPlaceAnimation: boolean;
  hasCountryFinishedVoting: boolean;
  boardAnimationClassName?: string;
  themeLayoutKey?: string;
};

const CountryItem = ({
  country,
  index,
  votingCountryCode,
  onClick,
  showPlaceAnimation,
  hasCountryFinishedVoting,
  boardAnimationClassName,
  themeLayoutKey = '',
  ...props
}: Props) => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const alwaysShowRankings = useGeneralStore(
    (state) => state.settings.alwaysShowRankings,
  );
  const enableMinimalisticFlags = useGeneralStore(
    (s) => s.settings.enableMinimalisticFlags,
  );

  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
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

  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const themeYear = useGeneralStore(
    (s) => s.customTheme?.baseThemeYear ?? s.themeYear,
  );
  const {
    uppercaseEntryName,
    flagShape,
    pointsContainerShape,
    roundedCountryContainer,
  } = useThemeSpecifics();

  const { lastPointsContainerRef, lastPointsTextRef } = useAnimatePoints({
    shouldShowLastPoints:
      country.lastReceivedPoints !== null && !isVotingFinished,
    isDouzePoints: !!country.showDouzePointsAnimation,
    douzePointsRefs,
    lastPointsAnimationDirection: roundedCountryContainer
      ? 'left-to-right'
      : 'right-to-left',
    pointsLayoutKey: themeLayoutKey,
  });

  const buttonSpecialStyle = getSpecialBackgroundStyle(
    buttonClassName,
    overrides,
    themeYear,
  );

  const flagClassName = useFlagClassName(
    flagShape,
    false,
    roundedCountryContainer,
  );

  /** Paints only the flag/name strip; outer row stays transparent under the last-points gutter. */
  const roundedNameStripSurfaceClasses = roundedCountryContainer
    ? splitRoundedCountryItemSurfaceClasses(buttonClassName).nameStripSurface
    : '';

  const televoteOutlineColor = useMemo(
    () => resolveTelevoteOutlineColor(themeYear, overrides),
    [themeYear, overrides],
  );

  const [isRoundedGlowHovered, setIsRoundedGlowHovered] = useState(false);

  const isRoundedGlowHoverable =
    roundedCountryContainer &&
    !isDisabled &&
    (isJuryVoting ||
      (!isJuryVoting && !isActive && revealTelevoteLowestToHighest));

  const isLowPerfDevice = useIsLowPerfDevice();

  const roundedContainerStyle = useMemo((): React.CSSProperties | undefined => {
    if (!roundedCountryContainer) return undefined;

    const glowHovered = isRoundedGlowHovered && isRoundedGlowHoverable;

    // The active televote halo never transitions: animating a blurred,
    // multi-layer drop-shadow across rows on every vote is what lags the 2026
    // board on weak GPUs. It snaps in; the state background still fades
    // (transition-colors on the container).
    if (isActive) {
      return {
        filter: buildActiveTelevoteDropShadowFilter(
          televoteOutlineColor,
          glowHovered,
        ),
      };
    }

    // The subtle glow only transitions for glow-hoverable rows (jury voting /
    // reveal mode) — one row at a time, on real hover, so its single-layer fade
    // is cheap. Disabled on low-perf devices, where even that is skipped.
    return {
      filter: glowHovered ? ROUNDED_SUBTLE_GLOW_HOVER : ROUNDED_SUBTLE_GLOW,
      transition:
        isRoundedGlowHoverable && !isLowPerfDevice
          ? ROUNDED_GLOW_TRANSITION
          : undefined,
    };
  }, [
    roundedCountryContainer,
    isActive,
    televoteOutlineColor,
    isRoundedGlowHovered,
    isRoundedGlowHoverable,
    isLowPerfDevice,
  ]);

  return (
    <CountryItemBase
      country={country}
      index={index}
      className={`${isVotingOver ? '' : 'md:~md/xl:~w-[14rem]/[26rem]'} ${
        boardAnimationClassName || ''
      }`}
      containerClassName={`${buttonClassName} flex-1 min-w-0 overflow-hidden ${
        roundedCountryContainer ? '!rounded-full !bg-transparent' : ''
      }`}
      style={
        roundedCountryContainer ? roundedContainerStyle : buttonSpecialStyle
      }
      useInlineContentLayout={roundedCountryContainer}
      contentStyle={roundedCountryContainer ? buttonSpecialStyle : undefined}
      contentClassName={
        roundedCountryContainer
          ? `rounded-r-full z-[21] shadow-[6px_0_10px_2px_rgba(0,0,0,0.15)] ${roundedNameStripSurfaceClasses} !opacity-100`
          : undefined
      }
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={
        isRoundedGlowHoverable ? () => setIsRoundedGlowHovered(true) : undefined
      }
      onMouseLeave={
        isRoundedGlowHoverable
          ? () => setIsRoundedGlowHovered(false)
          : undefined
      }
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
        } else if ('isVotingFinished' in country && country.isVotingFinished) {
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
            roundedCountryContainer={roundedCountryContainer}
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
            countryName={country.name}
            flagShape={flagShape}
            isTwoColumnLayout={isTwoColumnLayout}
            uppercaseEntryName={uppercaseEntryName}
          />
        ) : null
      }
      renderFlag={
        flagShape !== 'none'
          ? () => (
              <img
                src={getFlagPath(country, flagShape, enableMinimalisticFlags)}
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
          } font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm truncate flex-1 ${
            roundedCountryContainer
              ? 'mr-2 md:mr-2 lg:mr-2'
              : 'lg:mr-[2.57rem] md:mr-9 mr-8'
          }`}
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
          showLastPoints
          isFinished={
            !!('isVotingFinished' in country && country.isVotingFinished)
          }
          lastPointsBgClass={lastPointsBgClass}
          lastPointsTextClass={lastPointsTextClass}
          lastPointsRef={lastPointsTextRef}
          isTwoColumnLayout={isTwoColumnLayout}
          lastPointsContainerRef={lastPointsContainerRef}
          pointsContainerShape={pointsContainerShape}
          roundedCountryLayout={roundedCountryContainer}
          lastReceivedPointsActive={
            'lastReceivedPoints' in country &&
            country.lastReceivedPoints !== null &&
            !isVotingFinished
          }
          pointsLayoutKey={themeLayoutKey}
        />
      )}
      {...props}
    />
  );
};

export default React.memo(CountryItem);
