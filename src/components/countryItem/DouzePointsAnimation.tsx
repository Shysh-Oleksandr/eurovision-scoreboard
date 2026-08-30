import React, { useEffect, useMemo, useRef, useState } from 'react';

import { HeartIcon } from '@/assets/icons/HeartIcon';
import { getFlagOverlayOffsetClassName } from '@/components/countryItem/hooks/useFlagClassName';
import {
  extractSolidColorFromColorValue,
  buildBackgroundColorLookup,
  getSpecialBackgroundStyle,
} from '@/components/countryItem/utils/gradientUtils';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { playThemeSound } from '@/theme/playThemeSound';
import { DEFAULT_THEME_SPECIFICS } from '@/theme/themeSpecifics';
import { DouzePointsAnimationMode, FlagShape } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

type DouzePointsAnimationProps = {
  refs: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    parallelogramBlueRef: React.RefObject<HTMLDivElement | null>;
    parallelogramYellowRef: React.RefObject<HTMLDivElement | null>;
  };
  pointsAmount?: number;
  overrides?: Record<string, string> | null;
  countryName: string;
  flagShape: FlagShape;
  isTwoColumnLayout: boolean;
  uppercaseEntryName: boolean;
  isThemePreview?: boolean;
  douzePointsAnimationModeOverride?: DouzePointsAnimationMode;
};

const DOUZE_VISIBLE_ROWS = 3;
const DOUZE_OVERFLOW_ROWS = 1;
const DOUZE_POINTS_ROWS = DOUZE_VISIBLE_ROWS + DOUZE_OVERFLOW_ROWS * 2;
const DOUZE_POINTS_TARGET_COLUMNS = 15;
const HEARTS_MAX_SCALE = 2.25;
const HEARTS_GROW_COLUMN_DURATION_SECONDS = 0.8;
const HEARTS_SHRINK_COLUMN_DURATION_SECONDS = 0.8;
const HEARTS_GROW_STAGGER_SPAN_SECONDS = 0.8;
const HEARTS_SHRINK_STAGGER_SPAN_SECONDS = 0.8;
const HEARTS_REVERSE_DELAY_SECONDS = 0.7;

type BaseVariantProps = {
  refs: DouzePointsAnimationProps['refs'];
  pointsAmount: number;
  containerClass: string;
  specialStyle: React.CSSProperties | undefined;
  countryName: string;
  isTwoColumnLayout: boolean;
  uppercaseEntryName: boolean;
  heartsFillColor?: string;
  isThemePreview?: boolean;
  flagShape: FlagShape;
};

const LegacyParallelogramsAnimation: React.FC<BaseVariantProps> = ({
  refs,
  pointsAmount,
  containerClass,
  specialStyle,
}) => {
  return (
    <div
      ref={refs.containerRef}
      className={`${containerClass} bg-countryItem-douzePointsBg`}
      style={specialStyle}
    >
      <h4 className="text-countryItem-douzePointsText lg:text-xl md:text-lg xs:text-base text-sm font-bold uppercase">
        {pointsAmount} {pointsAmount === 1 ? 'point' : 'points'}
      </h4>
      <div
        ref={refs.parallelogramBlueRef}
        className="absolute h-full w-[25%] -translate-x-32 bg-countryItem-douzePointsBlock1 z-50"
      />
      <div
        ref={refs.parallelogramYellowRef}
        className="absolute -translate-x-56 h-full w-[25%] bg-countryItem-douzePointsBlock2 z-50"
      />
    </div>
  );
};

const HeartsGridAnimation: React.FC<BaseVariantProps> = ({
  refs,
  containerClass,
  specialStyle,
  countryName,
  isTwoColumnLayout,
  uppercaseEntryName,
  heartsFillColor,
  flagShape,
  isThemePreview = false,
}) => {
  const [columns, setColumns] = useState(DOUZE_POINTS_TARGET_COLUMNS);
  /** Play douze SFX only once per mount (Strict Mode re-runs effects). */
  const douzePointsSoundPlayedRef = useRef(false);
  const heartsCount = columns * DOUZE_POINTS_ROWS;

  useEffect(() => {
    const containerEl = refs.containerRef.current;

    if (!containerEl) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const [entry] = entries;
      const width = entry?.contentRect.width ?? 0;

      if (width <= 0) {
        return;
      }

      const nextColumns = Math.max(
        8,
        Math.min(
          20,
          Math.round((width / 24) * (DOUZE_POINTS_TARGET_COLUMNS / 12)),
        ),
      );

      setColumns(nextColumns);
    });

    resizeObserver.observe(containerEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [refs.containerRef]);

  useEffect(() => {
    if (douzePointsSoundPlayedRef.current) return;

    douzePointsSoundPlayedRef.current = true;
    playThemeSound('douzePoints', { skip: isThemePreview });
  }, [isThemePreview]);

  // The choreography itself is CSS (.douze-heart-animated in styles.css) so
  // the per-frame work runs on the compositor; this only derives the stagger
  // numbers the old GSAP timeline computed, exposed as CSS variables.
  const growStagger =
    columns > 1 ? HEARTS_GROW_STAGGER_SPAN_SECONDS / (columns - 1) : 0;
  const shrinkStagger =
    columns > 1 ? HEARTS_SHRINK_STAGGER_SPAN_SECONDS / (columns - 1) : 0;
  const shrinkPhaseStart =
    Math.max(0, (columns - 1) * growStagger) +
    HEARTS_GROW_COLUMN_DURATION_SECONDS +
    HEARTS_REVERSE_DELAY_SECONDS;

  const columnHeartVars = useMemo(() => {
    const maxScale =
      window.innerWidth > 768 ? HEARTS_MAX_SCALE : HEARTS_MAX_SCALE * 1.1;

    return Array.from(
      { length: columns },
      (_, column) =>
        ({
          '--douze-grow-delay': `${(columns - 1 - column) * growStagger}s`,
          '--douze-shrink-delay': `${
            shrinkPhaseStart + column * shrinkStagger
          }s`,
          '--douze-heart-scale': String(
            maxScale * (Math.random() * 0.2 + 0.95),
          ),
        } as React.CSSProperties),
    );
  }, [columns, growStagger, shrinkStagger, shrinkPhaseStart]);

  const hearts = useMemo(() => {
    return Array.from({ length: heartsCount }, (_, index) => index);
  }, [heartsCount]);

  return (
    <div
      ref={refs.containerRef}
      className={`${containerClass} p-0 !opacity-100`}
      style={specialStyle}
    >
      {/* Keyed on `columns` so a ResizeObserver column change remounts the
          cells and restarts the choreography (matches the old timeline
          rebuild). */}
      <div
        key={`douze-grid-${columns}`}
        className="absolute z-40 grid left-0 -right-2"
        style={
          {
            top: `${(-DOUZE_OVERFLOW_ROWS / DOUZE_VISIBLE_ROWS) * 100}%`,
            height: `${(DOUZE_POINTS_ROWS / DOUZE_VISIBLE_ROWS) * 100}%`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${DOUZE_POINTS_ROWS}, minmax(0, 1fr))`,
            '--douze-grow-duration': `${HEARTS_GROW_COLUMN_DURATION_SECONDS}s`,
            '--douze-shrink-duration': `${HEARTS_SHRINK_COLUMN_DURATION_SECONDS}s`,
          } as React.CSSProperties
        }
      >
        {hearts.map((heartIndex) => (
          <div
            key={`douze-heart-${heartIndex}`}
            className="douze-heart-animated overflow-hidden flex items-center justify-center"
            style={columnHeartVars[heartIndex % columns]}
          >
            <HeartIcon
              className={`w-full h-full ${
                heartsFillColor ? '' : 'fill-countryItem-douzePointsBg'
              }`}
              style={heartsFillColor ? { color: heartsFillColor } : undefined}
            />
          </div>
        ))}
      </div>
      <h4
        key={`douze-name-${columns}`}
        style={
          {
            '--douze-name-out-delay': `${shrinkPhaseStart}s`,
          } as React.CSSProperties
        }
        className={`douze-country-name-animated ${
          uppercaseEntryName ? 'uppercase' : ''
        } absolute z-50 left-0 text-countryItem-douzePointsText text-left ${
          isTwoColumnLayout
            ? 'xs:ml-2 ml-1.5 text-[0.8rem]'
            : `${
                flagShape === 'small-rectangle'
                  ? 'ml-[1px]'
                  : flagShape === 'round' || flagShape === 'round-border'
                  ? 'ml-[3px]'
                  : 'ml-2'
              } text-[0.9rem]`
        } font-bold ${
          isThemePreview
            ? 'text-sm'
            : 'xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm'
        } truncate max-w-[70%]`}
      >
        {countryName}
      </h4>
    </div>
  );
};

const DOUZE_POINTS_VARIANTS: Record<
  DouzePointsAnimationMode,
  React.FC<BaseVariantProps>
> = {
  parallelograms: LegacyParallelogramsAnimation,
  heartsGrid: HeartsGridAnimation,
};

const DouzePointsAnimation: React.FC<DouzePointsAnimationProps> = ({
  refs,
  pointsAmount = 12,
  overrides = null,
  countryName,
  flagShape,
  isTwoColumnLayout,
  uppercaseEntryName,
  isThemePreview = false,
  douzePointsAnimationModeOverride,
}) => {
  const globalPointsSystem = useGeneralStore((state) => state.pointsSystem);
  const stageJuryOverride = useScoreboardStore((state) => {
    if (isThemePreview) return undefined;

    return state.getCurrentStage()?.overrides?.pointsSystem?.pointsSystem;
  });
  const pointsSystem = stageJuryOverride ?? globalPointsSystem;
  const themeYear = useGeneralStore(
    (state) => state.customTheme?.baseThemeYear ?? state.themeYear,
  );
  const { douzePointsAnimationMode, roundedCountryContainer } =
    useThemeSpecifics();

  const resolvedDouzePointsAnimationMode =
    douzePointsAnimationModeOverride ?? douzePointsAnimationMode;
  const isKnownDouzePointsAnimationMode =
    resolvedDouzePointsAnimationMode in DOUZE_POINTS_VARIANTS;
  const activeDouzePointsAnimationMode = isKnownDouzePointsAnimationMode
    ? resolvedDouzePointsAnimationMode
    : DEFAULT_THEME_SPECIFICS.douzePointsAnimationMode;

  const flagOverlayOffsetClassName = getFlagOverlayOffsetClassName(
    flagShape,
    isThemePreview,
    roundedCountryContainer,
  );
  const containerClass = `absolute overflow-hidden ${
    activeDouzePointsAnimationMode === 'heartsGrid'
      ? flagOverlayOffsetClassName
      : 'left-0 bg-countryItem-douzePointsBg'
  } right-0 top-0 bottom-0 z-40 flex justify-center items-center opacity-0`;
  const specialStyle = getSpecialBackgroundStyle(
    containerClass,
    overrides,
    themeYear,
  );
  const heartsFillColor = extractSolidColorFromColorValue(
    buildBackgroundColorLookup(overrides, themeYear)?.[
      'countryItem.douzePointsBg'
    ],
  );

  const isDouzePoints =
    isThemePreview ||
    pointsSystem.some(
      (point) => point.showDouzePoints && point.value === pointsAmount,
    );

  if (!isDouzePoints) return null;

  const SelectedVariant = DOUZE_POINTS_VARIANTS[activeDouzePointsAnimationMode];

  return (
    <SelectedVariant
      refs={refs}
      pointsAmount={pointsAmount}
      containerClass={containerClass}
      specialStyle={specialStyle}
      countryName={countryName}
      isTwoColumnLayout={isTwoColumnLayout}
      uppercaseEntryName={uppercaseEntryName}
      heartsFillColor={heartsFillColor}
      isThemePreview={isThemePreview}
      flagShape={flagShape}
    />
  );
};

export default DouzePointsAnimation;
