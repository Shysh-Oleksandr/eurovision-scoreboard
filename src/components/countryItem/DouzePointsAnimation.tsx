import gsap from 'gsap';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { HeartIcon } from '@/assets/icons/HeartIcon';
import { getFlagOverlayOffsetClassName } from '@/components/countryItem/hooks/useFlagClassName';
import {
  extractSolidColorFromColorValue,
  getSpecialBackgroundStyle,
} from '@/components/countryItem/utils/gradientUtils';
import { useGeneralStore } from '@/state/generalStore';
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
  const heartRefs = useRef<Array<HTMLDivElement | null>>([]);
  const countryNameRef = useRef<HTMLHeadingElement | null>(null);
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

  useGSAP(
    () => {
      const hearts = heartRefs.current.filter((el): el is HTMLDivElement =>
        Boolean(el),
      );

      if (hearts.length === 0) {
        return;
      }

      gsap.killTweensOf(hearts);
      gsap.set(hearts, {
        scale: 0,
        transformOrigin: 'center center',
      });
      gsap.set(countryNameRef.current, { opacity: 0 });

      const timeline = gsap.timeline();
      const growStagger =
        columns > 1 ? HEARTS_GROW_STAGGER_SPAN_SECONDS / (columns - 1) : 0;
      const shrinkStagger =
        columns > 1 ? HEARTS_SHRINK_STAGGER_SPAN_SECONDS / (columns - 1) : 0;
      const growSpan = Math.max(0, (columns - 1) * growStagger);
      const shrinkPhaseStart =
        growSpan +
        HEARTS_GROW_COLUMN_DURATION_SECONDS +
        HEARTS_REVERSE_DELAY_SECONDS;

      timeline.to(
        countryNameRef.current,
        {
          opacity: 1,
          duration: 0.4,
          ease: 'power1.out',
        },
        0.3,
      );

      for (let column = columns - 1; column >= 0; column -= 1) {
        const columnHearts = hearts.filter(
          (_, index) => index % columns === column,
        );
        const columnPosition = (columns - 1 - column) * growStagger;

        const maxScale =
          window.innerWidth > 768 ? HEARTS_MAX_SCALE : HEARTS_MAX_SCALE * 1.1;

        timeline.to(
          columnHearts,
          {
            scale: maxScale * (Math.random() * 0.2 + 0.95),
            duration: HEARTS_GROW_COLUMN_DURATION_SECONDS,
            ease: 'power1.out',
          },
          columnPosition,
        );
      }

      for (let column = 0; column < columns; column += 1) {
        const columnHearts = hearts.filter(
          (_, index) => index % columns === column,
        );
        const columnPosition = shrinkPhaseStart + column * shrinkStagger;

        timeline.to(
          columnHearts,
          {
            scale: 0,
            duration: HEARTS_SHRINK_COLUMN_DURATION_SECONDS,
            ease: 'power2.in',
          },
          columnPosition,
        );
      }

      timeline.to(
        countryNameRef.current,
        {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.in',
        },
        shrinkPhaseStart,
      );
    },
    {
      scope: refs.containerRef,
      dependencies: [columns, heartsCount],
    },
  );

  const hearts = useMemo(() => {
    return Array.from({ length: heartsCount }, (_, index) => index);
  }, [heartsCount]);

  return (
    <div
      ref={refs.containerRef}
      className={`${containerClass} p-0 !opacity-100`}
      style={specialStyle}
    >
      <div
        className="absolute z-40 grid left-0 -right-2"
        style={{
          top: `${(-DOUZE_OVERFLOW_ROWS / DOUZE_VISIBLE_ROWS) * 100}%`,
          height: `${(DOUZE_POINTS_ROWS / DOUZE_VISIBLE_ROWS) * 100}%`,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${DOUZE_POINTS_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {hearts.map((heartIndex) => (
          <div
            key={`douze-heart-${heartIndex}`}
            className="overflow-hidden flex items-center justify-center"
            ref={(element) => {
              heartRefs.current[heartIndex] = element;
            }}
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
        ref={countryNameRef}
        className={`${
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
  const pointsSystem = useGeneralStore((state) => state.pointsSystem);
  const { douzePointsAnimationMode } = useThemeSpecifics();

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
  );
  const containerClass = `absolute overflow-hidden ${
    activeDouzePointsAnimationMode === 'heartsGrid'
      ? flagOverlayOffsetClassName
      : 'left-0'
  } right-0 top-0 bottom-0 z-40 flex justify-center items-center opacity-0`;
  const specialStyle = getSpecialBackgroundStyle(containerClass, overrides);
  const heartsFillColor = extractSolidColorFromColorValue(
    overrides?.['countryItem.douzePointsBg'],
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
