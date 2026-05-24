import React, { useMemo, useRef } from 'react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import DouzePointsAnimation from '@/components/countryItem/DouzePointsAnimation';
import useDouzePointsAnimation from '@/components/countryItem/hooks/useDouzePointsAnimation';
import useFlagClassName from '@/components/countryItem/hooks/useFlagClassName';
import PointsSection from '@/components/countryItem/PointsSection';
import {
  buildActiveTelevoteDropShadowFilter,
  resolveTelevoteOutlineColor,
  ROUNDED_GLOW_TRANSITION,
  ROUNDED_SUBTLE_GLOW,
  splitRoundedCountryItemSurfaceClasses,
} from '@/components/countryItem/utils/roundedCountryItemGlow';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getSpecialColorStyle } from '@/helpers/colorConversion';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import useAnimatePoints from '@/hooks/useAnimatePoints';
import { Country } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import {
  DouzePointsAnimationMode,
  FlagShape,
  ItemState,
  PointsContainerShape,
} from '@/theme/types';

// Determine colors based on state
type DerivedColors = {
  buttonBg: string;
  buttonText: string;
  pointsBg: string;
  pointsText: string;
  lastPointsBg: string;
  lastPointsText: string;
  buttonBgStyle?: React.CSSProperties;
  pointsBgStyle?: React.CSSProperties;
};

type ThemePreviewCountryItemUIProps = {
  baseThemeYear: string;
  state: ItemState;
  overrides?: Record<string, string>;
  points: number;
  lastPoints: number | null;
  showDouzePointsAnimation: boolean;
  previewCountryCode?: string;
  uppercaseEntryName?: boolean;
  pointsContainerShape?: PointsContainerShape;
  flagShape?: FlagShape;
  usePointsCountUpAnimation?: boolean;
  roundedCountryContainer?: boolean;
  douzePointsAnimationMode?: DouzePointsAnimationMode;
};

const ThemePreviewCountryItemUI: React.FC<ThemePreviewCountryItemUIProps> = ({
  baseThemeYear,
  state,
  overrides = {},
  points,
  lastPoints,
  showDouzePointsAnimation,
  previewCountryCode,
  uppercaseEntryName = true,
  pointsContainerShape = 'triangle',
  flagShape = 'big-rectangle',
  usePointsCountUpAnimation = true,
  roundedCountryContainer = false,
  douzePointsAnimationMode = 'heartsGrid',
}) => {
  const { user } = useAuthStore();
  const enableMinimalisticFlags = useGeneralStore(
    (s) => s.settings.enableMinimalisticFlags,
  );
  const previewCountry = useMemo(() => {
    return ALL_COUNTRIES.find(
      (country) =>
        country.code.toLowerCase() ===
        (previewCountryCode || user?.country || '/flags/ww.svg').toLowerCase(),
    )!;
  }, [user, previewCountryCode]);

  // Refs for douze points animation
  const douzePointsContainerRef = useRef<HTMLDivElement>(null);
  const douzePointsParallelogramBlueRef = useRef<HTMLDivElement>(null);
  const douzePointsParallelogramYellowRef = useRef<HTMLDivElement>(null);

  // Use lg+ styles only for consistent preview sizing
  const flagClassName = useFlagClassName(
    flagShape,
    true,
    roundedCountryContainer,
  );

  const { shouldRender: showDouzePointsAnimationHook } =
    useDouzePointsAnimation(
      showDouzePointsAnimation,
      previewCountry.code,
      lastPoints,
      true,
    );

  const douzePointsRefs = showDouzePointsAnimationHook
    ? {
        containerRef: douzePointsContainerRef,
        parallelogramBlueRef: douzePointsParallelogramBlueRef,
        parallelogramYellowRef: douzePointsParallelogramYellowRef,
      }
    : null;

  const mockCountry: Country = useMemo(
    () => ({
      code: previewCountry.code,
      name: previewCountry.name,
      flag: getFlagPath(previewCountry, flagShape, enableMinimalisticFlags),
      points,
      juryPoints: 0,
      televotePoints: 0,
      lastReceivedPoints: lastPoints === null ? null : lastPoints,
      isVotingFinished: false,
      showDouzePointsAnimation,
      qualifiedFromStageIds: [],
    }),
    [
      previewCountry,
      flagShape,
      enableMinimalisticFlags,
      points,
      lastPoints,
      showDouzePointsAnimation,
    ],
  );

  const { lastPointsContainerRef, lastPointsTextRef } = useAnimatePoints({
    shouldShowLastPoints:
      mockCountry.lastReceivedPoints !== null &&
      mockCountry.lastReceivedPoints > 0,
    isDouzePoints: showDouzePointsAnimation,
    douzePointsRefs,
    douzePointsAnimationModeOverride: douzePointsAnimationMode,
    isThemePreview: true,
    lastPointsAnimationDirection: roundedCountryContainer
      ? 'left-to-right'
      : 'right-to-left',
  });

  const {
    buttonBg,
    buttonText,
    pointsBg,
    pointsText,
    lastPointsBg,
    lastPointsText,
    buttonBgStyle,
  } = useMemo<DerivedColors>(() => {
    let buttonBg = '';
    let buttonText = '';
    let pointsBg = '';
    let pointsText = '';
    let lastPointsBg =
      'bg-countryItem-televoteLastPointsBg text-countryItem-televoteLastPointsBg';
    let lastPointsText = 'text-countryItem-televoteLastPointsText';

    let buttonBgStyle: React.CSSProperties | undefined;
    let bgOverride: string | undefined;

    if (state === 'unqualified') {
      buttonBg = 'bg-countryItem-unqualifiedBg opacity-70 !opacity-70';
      buttonText = 'text-countryItem-unqualifiedText';
      pointsBg =
        'bg-countryItem-unqualifiedPointsBg text-countryItem-unqualifiedPointsBg';
      pointsText = 'text-countryItem-unqualifiedPointsText';
      lastPointsBg =
        'bg-countryItem-unqualifiedLastPointsBg text-countryItem-unqualifiedLastPointsBg';
      lastPointsText = 'text-countryItem-unqualifiedLastPointsText';

      bgOverride = overrides['countryItem.unqualifiedBg'];
    }

    if (state === 'jury') {
      buttonBg = 'bg-countryItem-juryBg';
      buttonText = 'text-countryItem-juryCountryText';
      pointsBg = 'bg-countryItem-juryPointsBg text-countryItem-juryPointsBg';
      pointsText = 'text-countryItem-juryPointsText';
      lastPointsBg =
        'bg-countryItem-juryLastPointsBg text-countryItem-juryLastPointsBg';
      lastPointsText = 'text-countryItem-juryLastPointsText';

      bgOverride = overrides['countryItem.juryBg'];
    }

    if (state === 'televoteUnfinished') {
      buttonBg = 'bg-countryItem-televoteUnfinishedBg';
      buttonText = 'text-countryItem-televoteUnfinishedText';
      pointsBg =
        'bg-countryItem-televoteUnfinishedPointsBg text-countryItem-televoteUnfinishedPointsBg';
      pointsText = 'text-countryItem-televoteUnfinishedPointsText';
      // keep generic televote last points
      lastPointsBg =
        'bg-countryItem-televoteLastPointsBg text-countryItem-televoteLastPointsBg';
      lastPointsText = 'text-countryItem-televoteLastPointsText';

      bgOverride = overrides['countryItem.televoteUnfinishedBg'];
    }

    if (state === 'televoteActive') {
      buttonBg = roundedCountryContainer
        ? 'bg-countryItem-televoteActiveBg'
        : 'bg-countryItem-televoteActiveBg outline outline-2 outline-countryItem-televoteOutline';
      buttonText = 'text-countryItem-televoteActiveText';
      pointsBg =
        'bg-countryItem-televoteActivePointsBg text-countryItem-televoteActivePointsBg';
      pointsText = 'text-countryItem-televoteActivePointsText';
      lastPointsBg =
        'bg-countryItem-televoteActiveLastPointsBg text-countryItem-televoteActiveLastPointsBg';
      lastPointsText = 'text-countryItem-televoteActiveLastPointsText';

      bgOverride = overrides['countryItem.televoteActiveBg'];
    }
    if (state === 'televoteFinished') {
      buttonBg = 'bg-countryItem-televoteFinishedBg';
      buttonText = 'text-countryItem-televoteFinishedText';
      pointsBg =
        'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsBg';
      pointsText = 'text-countryItem-televoteFinishedPointsText';
      lastPointsBg =
        'bg-countryItem-televoteFinishedLastPointsBg text-countryItem-televoteFinishedLastPointsBg';
      lastPointsText = 'text-countryItem-televoteFinishedLastPointsText';

      bgOverride = overrides['countryItem.televoteFinishedBg'];
    }

    const { className: specialClassName, style: specialStyle } =
      getSpecialColorStyle(bgOverride);

    if (specialStyle) {
      buttonBg = specialClassName;
      buttonBgStyle = specialStyle;
    }

    if (state === 'jury') {
      buttonBg += ' brighten-on-hover';
    }

    return {
      buttonBg,
      buttonText,
      pointsBg,
      pointsText,
      lastPointsBg,
      lastPointsText,
      buttonBgStyle,
    };
  }, [state, overrides, roundedCountryContainer]);

  const televoteOutlineColor = useMemo(
    () => resolveTelevoteOutlineColor(baseThemeYear, overrides),
    [baseThemeYear, overrides],
  );

  const roundedContainerStyle = useMemo((): React.CSSProperties | undefined => {
    if (!roundedCountryContainer) return undefined;

    if (state === 'televoteActive') {
      return {
        filter: buildActiveTelevoteDropShadowFilter(televoteOutlineColor),
        transition: ROUNDED_GLOW_TRANSITION,
      };
    }

    return {
      filter: ROUNDED_SUBTLE_GLOW,
      transition: ROUNDED_GLOW_TRANSITION,
    };
  }, [roundedCountryContainer, state, televoteOutlineColor]);

  const {
    containerOpacity: containerOpacityClass,
    nameStripSurface: roundedNameStripSurfaceClasses,
  } = useMemo(
    () =>
      roundedCountryContainer
        ? splitRoundedCountryItemSurfaceClasses(buttonBg)
        : { containerOpacity: '', nameStripSurface: '' },
    [roundedCountryContainer, buttonBg],
  );

  return (
    <CountryItemBase
      country={mockCountry}
      index={0}
      className="flex items-center"
      containerClassName={`relative flex justify-between shadow-md w-full overflow-hidden rounded-sm ${
        roundedCountryContainer ? '!rounded-full !bg-transparent' : ''
      } h-10 ${
        roundedCountryContainer
          ? `${buttonText} ${containerOpacityClass}`
          : `${buttonBg} ${buttonText}`
      }`}
      style={roundedCountryContainer ? roundedContainerStyle : buttonBgStyle}
      useInlineContentLayout={roundedCountryContainer}
      contentStyle={roundedCountryContainer ? buttonBgStyle : undefined}
      contentClassName={
        roundedCountryContainer
          ? `rounded-r-full z-[21] shadow-[4px_0_10px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_10px_rgba(0,0,0,0.35)] ${roundedNameStripSurfaceClasses} !opacity-100`
          : undefined
      }
      as="div"
      showPlaceNumber
      renderPlaceNumber={(_country, index) => (
        <CountryPlaceNumber
          shouldShowAsNonQualified={state === 'unqualified'}
          index={index}
          showPlaceAnimation
          points={0}
          isJuryVoting={false}
          size="lg"
          state={state}
          overrides={overrides}
          roundedCountryContainer={roundedCountryContainer}
        />
      )}
      renderDouzePointsAnimation={() =>
        showDouzePointsAnimationHook ? (
          <DouzePointsAnimation
            refs={{
              containerRef: douzePointsContainerRef,
              parallelogramBlueRef: douzePointsParallelogramBlueRef,
              parallelogramYellowRef: douzePointsParallelogramYellowRef,
            }}
            overrides={overrides}
            countryName={mockCountry.name}
            flagShape={flagShape}
            isTwoColumnLayout={false}
            uppercaseEntryName={uppercaseEntryName}
            isThemePreview
            douzePointsAnimationModeOverride={douzePointsAnimationMode}
          />
        ) : null
      }
      renderFlag={
        flagShape === 'none'
          ? undefined
          : () => (
              <img
                loading="lazy"
                src={mockCountry.flag || '/flags/ww.svg'}
                alt={`${mockCountry.name} flag`}
                width={48}
                height={36}
                className={`${flagClassName} bg-countryItem-juryBg object-cover`}
                onError={(e) =>
                  handleFlagError(e.currentTarget, mockCountry, flagShape)
                }
              />
            )
      }
      renderName={() => (
        <h4
          className={`${
            uppercaseEntryName ? 'uppercase' : ''
          } text-left ml-2 font-bold text-sm truncate flex-1 ${
            roundedCountryContainer ? 'mr-2' : ''
          }`}
        >
          {mockCountry.name}
        </h4>
      )}
      renderPoints={(country) => (
        <PointsSection
          country={country}
          pointsBgClass={pointsBg}
          pointsTextClass={pointsText}
          shouldShowNQLabel={state === 'unqualified'}
          showLastPoints={
            roundedCountryContainer || (lastPoints !== null && lastPoints > 0)
          }
          lastPointsBgClass={lastPointsBg}
          lastPointsTextClass={lastPointsText}
          lastPointsRef={lastPointsTextRef}
          lastPointsContainerRef={lastPointsContainerRef}
          pointsContainerShape={pointsContainerShape}
          pointsContainerClassName={
            roundedCountryContainer ? undefined : 'ml-auto'
          }
          usePointsCountUpAnimationOverride={usePointsCountUpAnimation}
          roundedCountryLayout={roundedCountryContainer}
          lastReceivedPointsActive={lastPoints !== null && lastPoints > 0}
        />
      )}
    />
  );
};

export default ThemePreviewCountryItemUI;
