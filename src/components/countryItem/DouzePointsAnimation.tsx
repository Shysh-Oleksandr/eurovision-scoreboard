import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { HeartIcon } from '@/assets/icons/HeartIcon';
import {
  extractSolidColorFromColorValue,
  buildBackgroundColorLookup,
  getSpecialBackgroundStyle,
} from '@/components/countryItem/utils/gradientUtils';
import { playHaptic } from '@/native/haptics';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { playThemeSound } from '@/theme/playThemeSound';
import { DEFAULT_THEME_SPECIFICS } from '@/theme/themeSpecifics';
import { DouzePointsAnimationMode } from '@/theme/types';
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
  /**
   * The row's flag classes (`useFlagClassName`), or undefined when the row has
   * no flag. The hearts overlay lays out an invisible copy of the flag so it
   * starts exactly at the flag's right edge, whatever the shape or breakpoint.
   */
  flagClassName?: string;
  /** The row's name classes, so the overlay name sits exactly on top of it. */
  nameClassName: string;
  /** The row's name element; the overlay name copies its width (same truncation). */
  sourceNameRef?: React.RefObject<HTMLHeadingElement | null>;
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
// The last column's grow delay is always the full stagger span, so the shrink
// phase starts at a constant offset regardless of column count.
const HEARTS_SHRINK_PHASE_START_SECONDS =
  HEARTS_GROW_STAGGER_SPAN_SECONDS +
  HEARTS_GROW_COLUMN_DURATION_SECONDS +
  HEARTS_REVERSE_DELAY_SECONDS;

type BaseVariantProps = {
  refs: DouzePointsAnimationProps['refs'];
  pointsAmount: number;
  containerClass: string;
  specialStyle: React.CSSProperties | undefined;
  countryName: string;
  flagClassName?: string;
  nameClassName: string;
  sourceNameRef?: React.RefObject<HTMLHeadingElement | null>;
  heartsFillColor?: string;
  isThemePreview?: boolean;
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
      className={`${containerClass} left-0 justify-center bg-countryItem-douzePointsBg`}
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
  flagClassName,
  nameClassName,
  sourceNameRef,
  heartsFillColor,
  isThemePreview = false,
}) => {
  const [columns, setColumns] = useState(DOUZE_POINTS_TARGET_COLUMNS);
  const [sourceNameWidth, setSourceNameWidth] = useState<number | null>(null);
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

  // In the rounded layout the row's name stops before the points while the
  // overlay spans them, so copy the name's width to truncate identically.
  useLayoutEffect(() => {
    const sourceNameEl = sourceNameRef?.current;

    if (!sourceNameEl) {
      return;
    }

    setSourceNameWidth(sourceNameEl.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver(() => {
      setSourceNameWidth(sourceNameEl.getBoundingClientRect().width);
    });

    resizeObserver.observe(sourceNameEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [sourceNameRef]);

  useEffect(() => {
    if (douzePointsSoundPlayedRef.current) return;

    douzePointsSoundPlayedRef.current = true;
    playThemeSound('douzePoints', { skip: isThemePreview });
    // The hearts bloom. The 12 itself was felt at the award (votingActions);
    // in teleport themes the overlay waits for the row's move, so this lands
    // ~2 s later, with the hearts.
    if (!isThemePreview) playHaptic({ id: 'douzeBloom', variant: 'hearts' });
  }, [isThemePreview]);

  // The choreography itself is CSS (.douze-heart-animated in styles.css) so
  // the per-frame work runs on the compositor; this only derives the
  // per-column stagger delays the old GSAP timeline computed, exposed as CSS
  // variables.
  const columnHeartVars = useMemo(() => {
    const growStagger =
      columns > 1 ? HEARTS_GROW_STAGGER_SPAN_SECONDS / (columns - 1) : 0;
    const shrinkStagger =
      columns > 1 ? HEARTS_SHRINK_STAGGER_SPAN_SECONDS / (columns - 1) : 0;
    const maxScale =
      window.innerWidth > 768 ? HEARTS_MAX_SCALE : HEARTS_MAX_SCALE * 1.1;

    return Array.from(
      { length: columns },
      (_, column) =>
        ({
          '--douze-grow-delay': `${(columns - 1 - column) * growStagger}s`,
          '--douze-shrink-delay': `${
            HEARTS_SHRINK_PHASE_START_SECONDS + column * shrinkStagger
          }s`,
          '--douze-heart-scale': String(
            maxScale * (Math.random() * 0.2 + 0.95),
          ),
        } as React.CSSProperties),
    );
  }, [columns]);

  const hearts = useMemo(() => {
    return Array.from({ length: heartsCount }, (_, index) => index);
  }, [heartsCount]);

  return (
    // Mirrors the row's content layout (flag, then name) so the name lands on
    // the row's name to the pixel and the hearts start at the flag's edge.
    <div className={`${containerClass} left-0 p-0 !opacity-100`}>
      {flagClassName && (
        <div aria-hidden className={`${flagClassName} invisible shrink-0`} />
      )}
      <div
        ref={refs.containerRef}
        className="relative self-stretch flex-1 min-w-0 overflow-hidden flex items-center"
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
              '--douze-name-out-delay': `${HEARTS_SHRINK_PHASE_START_SECONDS}s`,
              ...(sourceNameWidth !== null && {
                flex: 'none',
                width: sourceNameWidth,
              }),
            } as React.CSSProperties
          }
          className={`douze-country-name-animated relative z-50 text-countryItem-douzePointsText ${nameClassName}`}
        >
          {countryName}
        </h4>
      </div>
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
  flagClassName,
  nameClassName,
  sourceNameRef,
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
  const { douzePointsAnimationMode } = useThemeSpecifics();

  const resolvedDouzePointsAnimationMode =
    douzePointsAnimationModeOverride ?? douzePointsAnimationMode;
  const isKnownDouzePointsAnimationMode =
    resolvedDouzePointsAnimationMode in DOUZE_POINTS_VARIANTS;
  const activeDouzePointsAnimationMode = isKnownDouzePointsAnimationMode
    ? resolvedDouzePointsAnimationMode
    : DEFAULT_THEME_SPECIFICS.douzePointsAnimationMode;

  const containerClass = `absolute overflow-hidden right-0 top-0 bottom-0 z-40 flex items-center opacity-0`;
  const specialStyle = getSpecialBackgroundStyle(
    activeDouzePointsAnimationMode === 'heartsGrid'
      ? containerClass
      : `${containerClass} bg-countryItem-douzePointsBg`,
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
      flagClassName={flagClassName}
      nameClassName={nameClassName}
      sourceNameRef={sourceNameRef}
      heartsFillColor={heartsFillColor}
      isThemePreview={isThemePreview}
    />
  );
};

export default DouzePointsAnimation;
