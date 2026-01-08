import React, { useMemo, useRef } from 'react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import DouzePointsAnimation from '@/components/countryItem/DouzePointsAnimation';
import useDouzePointsAnimation from '@/components/countryItem/hooks/useDouzePointsAnimation';
import RoundedTriangle from '@/components/RoundedTriangle';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getFlagPath } from '@/helpers/getFlagPath';
import useAnimatePoints from '@/hooks/useAnimatePoints';
import { Country } from '@/models';
import { useAuthStore } from '@/state/useAuthStore';

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

export type ItemState =
  | 'jury'
  | 'unfinished'
  | 'active'
  | 'finished'
  | 'unqualified';

type ThemePreviewCountryItemUIProps = {
  state: ItemState;
  overrides?: Record<string, string>;
  points: number;
  lastPoints: number | null;
  showDouzePointsAnimation: boolean;
  previewCountryCode?: string;
};

const ThemePreviewCountryItemUI: React.FC<ThemePreviewCountryItemUIProps> = ({
  state,
  overrides = {},
  points,
  lastPoints,
  showDouzePointsAnimation,
  previewCountryCode,
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
    flag: getFlagPath(previewCountry),
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

    if (state === 'unqualified') {
      buttonBg = 'bg-countryItem-unqualifiedBg opacity-70';
      buttonText = 'text-countryItem-unqualifiedText';
      pointsBg =
        'bg-countryItem-unqualifiedPointsBg text-countryItem-unqualifiedPointsBg';
      pointsText = 'text-countryItem-unqualifiedPointsText';
      lastPointsBg =
        'bg-countryItem-unqualifiedLastPointsBg text-countryItem-unqualifiedLastPointsBg';
      lastPointsText = 'text-countryItem-unqualifiedLastPointsText';

      const bgOverride = overrides['countryItem.unqualifiedBg'];

      if (bgOverride && /gradient\(/i.test(bgOverride)) {
        buttonBg = '';
        buttonBgStyle = { background: bgOverride };
      }
    }

    if (state === 'jury') {
      buttonBg =
        'bg-countryItem-juryBg hover:bg-countryItem-juryHoverBg cursor-pointer transition-colors !duration-500';
      buttonText = 'text-countryItem-juryCountryText';
      pointsBg = 'bg-countryItem-juryPointsBg text-countryItem-juryPointsBg';
      pointsText = 'text-countryItem-juryPointsText';
      lastPointsBg =
        'bg-countryItem-juryLastPointsBg text-countryItem-juryLastPointsBg';
      lastPointsText = 'text-countryItem-juryLastPointsText';

      const bgOverride = overrides['countryItem.juryBg'];

      if (bgOverride && /gradient\(/i.test(bgOverride)) {
        buttonBg = '';
        buttonBgStyle = { background: bgOverride };
      }
    }

    if (state === 'unfinished') {
      buttonBg = 'bg-countryItem-televoteUnfinishedBg';
      buttonText = 'text-countryItem-televoteUnfinishedText';
      pointsBg =
        'bg-countryItem-televoteUnfinishedPointsBg text-countryItem-televoteUnfinishedPointsBg';
      pointsText = 'text-countryItem-televoteUnfinishedPointsText';
      // keep generic televote last points
      lastPointsBg =
        'bg-countryItem-televoteLastPointsBg text-countryItem-televoteLastPointsBg';
      lastPointsText = 'text-countryItem-televoteLastPointsText';

      const bgOverride = overrides['countryItem.televoteUnfinishedBg'];

      if (bgOverride && /gradient\(/i.test(bgOverride)) {
        buttonBg = '';
        buttonBgStyle = { background: bgOverride };
      }
    }

    if (state === 'active') {
      buttonBg =
        'bg-countryItem-televoteActiveBg outline outline-2 outline-countryItem-televoteOutline';
      buttonText = 'text-countryItem-televoteActiveText';
      pointsBg =
        'bg-countryItem-televoteActivePointsBg text-countryItem-televoteActivePointsBg';
      pointsText = 'text-countryItem-televoteActivePointsText';
      lastPointsBg =
        'bg-countryItem-televoteActiveLastPointsBg text-countryItem-televoteActiveLastPointsBg';
      lastPointsText = 'text-countryItem-televoteActiveLastPointsText';

      const bgOverride = overrides['countryItem.televoteActiveBg'];

      if (bgOverride && /gradient\(/i.test(bgOverride)) {
        buttonBgStyle = { background: bgOverride };
      }
    }
    if (state === 'finished') {
      buttonBg = 'bg-countryItem-televoteFinishedBg';
      buttonText = 'text-countryItem-televoteFinishedText';
      pointsBg =
        'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsBg';
      pointsText = 'text-countryItem-televoteFinishedPointsText';
      lastPointsBg =
        'bg-countryItem-televoteFinishedLastPointsBg text-countryItem-televoteFinishedLastPointsBg';
      lastPointsText = 'text-countryItem-televoteFinishedLastPointsText';

      const bgOverride = overrides['countryItem.televoteFinishedBg'];

      if (bgOverride && /gradient\(/i.test(bgOverride)) {
        buttonBg = '';
        buttonBgStyle = { background: bgOverride };
      }
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
      renderFlag={() => (
        <img
          loading="lazy"
          src={mockCountry.flag || '/flags/ww.svg'}
          alt={`${mockCountry.name} flag`}
          width={48}
          height={36}
          className="w-[50px] h-10 min-w-[50px] bg-countryItem-juryBg self-start object-cover"
          onError={(e) => {
            e.currentTarget.src = getFlagPath('ww');
          }}
        />
      )}
      renderName={() => (
        <h4 className="uppercase text-left ml-2 font-bold text-sm truncate flex-1">
          {mockCountry.name}
        </h4>
      )}
      renderPoints={() => (
        <>
          {/* Last points */}
          {lastPoints !== null && lastPoints > 0 && (
            <div
              className={`absolute right-8 z-10 h-full pr-[0.6rem] w-8 transition-colors !duration-500 ${lastPointsBg}`}
            >
              <RoundedTriangle className={lastPointsBg} />
              <h6
                className={`text-sm font-semibold h-full items-center flex justify-center ${lastPointsText}`}
              >
                {lastPoints}
              </h6>
            </div>
          )}

          {/* Points */}
          <div
            className={`absolute right-0 top-0 h-full z-20 w-8 pr-1 transition-colors !duration-500 ${pointsBg}`}
          >
            <RoundedTriangle className={pointsBg} />
            <h6
              className={`text-sm font-semibold h-full items-center flex justify-center ${pointsText}`}
            >
              {state === 'unqualified' ? 'NQ' : points}
            </h6>
          </div>
        </>
      )}
    />
  );
};

export default ThemePreviewCountryItemUI;
