import React, { useMemo, useRef } from 'react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import DouzePointsAnimation from '@/components/countryItem/DouzePointsAnimation';
import useDouzePointsAnimation from '@/components/countryItem/hooks/useDouzePointsAnimation';
import useFlagClassName from '@/components/countryItem/hooks/useFlagClassName';
import PointsSection from '@/components/countryItem/PointsSection';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getSpecialColorStyle } from '@/helpers/colorConversion';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import useAnimatePoints from '@/hooks/useAnimatePoints';
import { Country } from '@/models';
import { useAuthStore } from '@/state/useAuthStore';
import { FlagShape, ItemState, PointsContainerShape } from '@/theme/types';

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
  state: ItemState;
  overrides?: Record<string, string>;
  points: number;
  lastPoints: number | null;
  showDouzePointsAnimation: boolean;
  previewCountryCode?: string;
  uppercaseEntryName?: boolean;
  pointsContainerShape?: PointsContainerShape;
  flagShape?: FlagShape;
};

const ThemePreviewCountryItemUI: React.FC<ThemePreviewCountryItemUIProps> = ({
  state,
  overrides = {},
  points,
  lastPoints,
  showDouzePointsAnimation,
  previewCountryCode,
  uppercaseEntryName = true,
  pointsContainerShape = 'triangle',
  flagShape = 'big-rectangle',
}) => {
  const { user } = useAuthStore();

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
  const flagClassName = useFlagClassName(flagShape, true);

  const { shouldRender: showDouzePointsAnimationHook } =
    useDouzePointsAnimation(
      showDouzePointsAnimation,
      previewCountry.code,
      lastPoints,
    );

  const douzePointsRefs = showDouzePointsAnimationHook
    ? {
        containerRef: douzePointsContainerRef,
        parallelogramBlueRef: douzePointsParallelogramBlueRef,
        parallelogramYellowRef: douzePointsParallelogramYellowRef,
      }
    : null;

  useAnimatePoints({
    shouldShowLastPoints: false,
    isDouzePoints: showDouzePointsAnimation,
    douzePointsRefs,
  });

  // Mock country
  const mockCountry: Country = {
    code: previewCountry.code,
    name: previewCountry.name,
    flag: getFlagPath(previewCountry, flagShape),
    points,
    juryPoints: 0,
    televotePoints: 0,
    lastReceivedPoints: lastPoints || null,
    isVotingFinished: false,
    showDouzePointsAnimation: showDouzePointsAnimation,
    qualifiedFromStageIds: [],
  };

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
      buttonBg = 'bg-countryItem-unqualifiedBg opacity-70';
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
      buttonBg =
        'bg-countryItem-televoteActiveBg outline outline-2 outline-countryItem-televoteOutline';
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
  }, [state, overrides]);

  return (
    <CountryItemBase
      country={mockCountry}
      index={0}
      className="flex items-center"
      containerClassName={`relative flex justify-between shadow-md w-full overflow-hidden rounded-sm h-10 ${buttonBg} ${buttonText}`}
      style={buttonBgStyle}
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
          } text-left ml-2 font-bold text-sm truncate flex-1`}
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
          showLastPoints={lastPoints !== null && lastPoints > 0}
          lastPointsBgClass={lastPointsBg}
          lastPointsTextClass={lastPointsText}
          pointsContainerShape={pointsContainerShape}
        />
      )}
    />
  );
};

export default ThemePreviewCountryItemUI;
