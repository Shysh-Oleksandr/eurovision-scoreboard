import React, { useMemo, useRef, useState } from 'react';

import Badge from '@/components/common/Badge';
import VotingPointsInfo from '@/components/controlsPanel/VotingPointsInfo';
import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import DouzePointsAnimation from '@/components/countryItem/DouzePointsAnimation';
import useDouzePointsAnimation from '@/components/countryItem/hooks/useDouzePointsAnimation';
import RoundedTriangle from '@/components/RoundedTriangle';
import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getFlagPath } from '@/helpers/getFlagPath';
import useAnimatePoints from '@/hooks/useAnimatePoints';
import { Country } from '@/models';
import { useAuthStore } from '@/state/useAuthStore';
import { getThemeBackground } from '@/theme/themes';

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

const previewBadges = [
  {
    label: 'Jury',
    key: 'jury',
  },
  {
    label: 'Televote',
    key: 'unfinished',
  },
  {
    label: 'Active',
    key: 'active',
  },
  {
    label: 'Finished',
    key: 'finished',
  },
  {
    label: 'Unqualified',
    key: 'unqualified',
  },
];

type ItemState = 'jury' | 'unfinished' | 'active' | 'finished' | 'unqualified';

type ThemePreviewCountryItemCompactProps = {
  backgroundImage: string | null;
  overrides?: Record<string, string>;
  baseThemeYear: string;
  points: number;
  lastPoints: number | null;
  showDouzePointsAnimation: boolean;
  isListItem?: boolean;
  previewCountryCode?: string;
  onClick?: () => void;
};

const ThemePreviewCountryItemCompact: React.FC<
  ThemePreviewCountryItemCompactProps
> = ({
  backgroundImage,
  overrides = {},
  baseThemeYear,
  points,
  lastPoints,
  showDouzePointsAnimation,
  isListItem = false,
  previewCountryCode,
  onClick,
}) => {
  const { user } = useAuthStore();

  const previewCountry = useMemo(() => {
    return ALL_COUNTRIES.find(
      (country) =>
        country.code.toLowerCase() ===
        (previewCountryCode || user?.country || 'ww').toLowerCase(),
    )!;
  }, [user, previewCountryCode]);

  const [state, setState] = useState<ItemState>('jury');

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

  // Fallback background: base theme background image for the selected year
  const baseBackgroundImage = getThemeBackground(baseThemeYear);

  // Mock country
  const mockCountry: Partial<Country> = {
    code: previewCountry.code,
    name: previewCountry.name,
    flag: getFlagPath(previewCountry),
    points,
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
    <>
      {/* State selector */}
      <div className="flex w-full sm:flex-wrap sm:gap-2 gap-1.5 overflow-x-auto sm:overflow-x-hidden sm:pb-0 pb-2 narrow-scrollbar">
        {previewBadges.map((badge) => (
          <Badge
            key={badge.label}
            label={badge.label}
            onClick={() => setState(badge.key as ItemState)}
            isActive={state === (badge.key as ItemState)}
          />
        ))}
      </div>

      <div
        className={`sm:space-y-4 space-y-2 px-4 sm:py-8 py-6 max-w-[400px] w-full ${
          isListItem ? 'sm:min-w-[300px] md:min-w-[400px]' : ''
        } ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        style={{
          backgroundImage: `url(${backgroundImage || baseBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="flex items-center">
          <CountryPlaceNumber
            shouldShowAsNonQualified={state === 'unqualified'}
            index={0}
            showPlaceAnimation
            points={0}
            isJuryVoting={false}
            size="lg"
          />
          {/* Country Item Preview */}
          <div
            className={`relative flex justify-between shadow-md w-full overflow-hidden rounded-sm h-10 ${buttonBg} ${buttonText}`}
            style={buttonBgStyle}
          >
            {showDouzePointsAnimationHook && (
              <DouzePointsAnimation
                refs={{
                  containerRef: douzePointsContainerRef,
                  parallelogramBlueRef: douzePointsParallelogramBlueRef,
                  parallelogramYellowRef: douzePointsParallelogramYellowRef,
                }}
                overrides={overrides}
              />
            )}
            <div className="flex items-center overflow-hidden flex-1">
              <img
                src={mockCountry.flag}
                alt={`${mockCountry.name} flag`}
                width={48}
                height={36}
                className="w-[50px] h-10 min-w-[50px] bg-countryItem-juryBg self-start object-cover"
                onError={(e) => {
                  e.currentTarget.src = getFlagPath('ww');
                }}
              />
              <h4 className="uppercase text-left ml-2 font-bold text-sm truncate flex-1">
                {mockCountry.name}
              </h4>
            </div>

            <div className="flex h-full flex-shrink-0">
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
                className={`relative h-full z-20 w-8 pr-1 transition-colors !duration-500 ${pointsBg}`}
              >
                <RoundedTriangle className={pointsBg} />
                <h6
                  className={`text-sm font-semibold h-full items-center flex justify-center ${pointsText}`}
                >
                  {state === 'unqualified' ? 'NQ' : points}
                </h6>
              </div>
            </div>
          </div>
        </div>

        <VotingPointsInfo customVotingPointsIndex={isListItem ? 9 : 0} />
      </div>
    </>
  );
};

export default ThemePreviewCountryItemCompact;
