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
import {
  type DouzeOptions,
  douzeDurationScale,
  restrictDouzeOptions,
} from '@/douze/options';
import { getDouzeOptionsSupport, getDouzeSpec } from '@/douze/registry';
import { useRowFlagColors } from '@/douze/useRowFlagColors';
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
  /** The theme editor's options (null: none); otherwise the theme's. */
  douzeOptionsOverride?: DouzeOptions | null;
  /** A custom entry's chosen colours, used in place of its flag's. */
  entryColors?: readonly string[] | null;
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
  /** How much longer than built it runs (1 / the options' speed). */
  durationScale: number;
  /** Colour from the row's flag ("Flag colors") instead of the theme's. */
  useFlagColors: boolean;
  /** A custom entry's chosen colours, used in place of its flag's. */
  entryColors?: readonly string[] | null;
  /** Parts switched off ("Customize animation"). */
  off: ReadonlySet<string>;
  /** The hearts cover the flag too ("Customize animation"). */
  coverFlag: boolean;
};

const LegacyParallelogramsAnimation: React.FC<BaseVariantProps> = ({
  refs,
  pointsAmount,
  containerClass,
  specialStyle,
  useFlagColors,
  entryColors,
  off,
}) => {
  const flagColors = useRowFlagColors(
    refs.containerRef,
    useFlagColors,
    entryColors,
  );
  // The blocks stay mounted when switched off: useAnimatePoints' timeline
  // needs them to show the container.
  const blockStyle = (index: number): React.CSSProperties => ({
    ...(flagColors && {
      backgroundColor: flagColors[index] ?? flagColors[0],
    }),
    ...(off.has('blocks') && { visibility: 'hidden' }),
  });

  return (
    <div
      ref={refs.containerRef}
      className={`${containerClass} left-0 justify-center bg-countryItem-douzePointsBg`}
      style={specialStyle}
    >
      {!off.has('label') && (
        <h4 className="text-countryItem-douzePointsText lg:text-xl md:text-lg xs:text-base text-sm font-bold uppercase">
          {pointsAmount} {pointsAmount === 1 ? 'point' : 'points'}
        </h4>
      )}
      <div
        ref={refs.parallelogramBlueRef}
        className="absolute h-full w-[25%] -translate-x-32 bg-countryItem-douzePointsBlock1 z-50"
        style={blockStyle(0)}
      />
      <div
        ref={refs.parallelogramYellowRef}
        className="absolute -translate-x-56 h-full w-[25%] bg-countryItem-douzePointsBlock2 z-50"
        style={blockStyle(1)}
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
  durationScale,
  useFlagColors,
  entryColors,
  off,
  coverFlag,
}) => {
  const [columns, setColumns] = useState(DOUZE_POINTS_TARGET_COLUMNS);
  // Flag colours run in bands across the row, in the flag's reading order.
  const flagColors = useRowFlagColors(
    refs.containerRef,
    useFlagColors,
    entryColors,
  );
  const [sourceName, setSourceName] = useState<{
    width: number;
    style: React.CSSProperties;
  } | null>(null);
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
  // overlay spans them, so copy the name's width to truncate identically,
  // and its font size (a host may size the row's name past the shared
  // classes). Host rules that restyle names (`[data-entry-name]`) also
  // match the overlay's `data-douze-name`.
  useLayoutEffect(() => {
    const sourceNameEl = sourceNameRef?.current;

    if (!sourceNameEl) {
      return;
    }

    // Used values in the element's own CSS px: unlike the bounding rect,
    // they stay right when an ancestor is zoomed (the scaled board).
    const read = () => {
      const computed = getComputedStyle(sourceNameEl);

      setSourceName({
        width:
          parseFloat(computed.width) ||
          sourceNameEl.getBoundingClientRect().width,
        style: {
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
        },
      });
    };

    read();

    const resizeObserver = new ResizeObserver(read);

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
          '--douze-grow-delay': `${
            (columns - 1 - column) * growStagger * durationScale
          }s`,
          '--douze-shrink-delay': `${
            (HEARTS_SHRINK_PHASE_START_SECONDS + column * shrinkStagger) *
            durationScale
          }s`,
          '--douze-heart-scale': String(
            maxScale * (Math.random() * 0.2 + 0.95),
          ),
          ...(flagColors && {
            color:
              flagColors[
                Math.min(
                  flagColors.length - 1,
                  Math.floor((column * flagColors.length) / columns),
                )
              ],
          }),
        } as React.CSSProperties),
    );
  }, [columns, durationScale, flagColors]);

  const hearts = useMemo(() => {
    return Array.from({ length: heartsCount }, (_, index) => index);
  }, [heartsCount]);

  // An invisible copy of the row's flag, so the name sits on the row's name.
  const flagSpacer = flagClassName && (
    <div
      aria-hidden
      data-douze-flag=""
      className={`${flagClassName} invisible shrink-0`}
    />
  );

  return (
    // Mirrors the row's content layout (flag, then name) so the name lands on
    // the row's name to the pixel and the hearts start at the flag's edge.
    // Covering the flag, the flag's stand-in moves inside the hearts' box:
    // the hearts span the whole row and the name keeps its place.
    <div className={`${containerClass} left-0 p-0 !opacity-100`}>
      {!coverFlag && flagSpacer}
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
              '--douze-grow-duration': `${
                HEARTS_GROW_COLUMN_DURATION_SECONDS * durationScale
              }s`,
              '--douze-shrink-duration': `${
                HEARTS_SHRINK_COLUMN_DURATION_SECONDS * durationScale
              }s`,
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
                  heartsFillColor || flagColors
                    ? ''
                    : 'fill-countryItem-douzePointsBg'
                }`}
                // With flag colours, the column's colour comes from its cell.
                style={
                  heartsFillColor && !flagColors
                    ? { color: heartsFillColor }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
        {coverFlag && flagSpacer}
        {!off.has('name') && (
          <h4
            key={`douze-name-${columns}`}
            style={
              {
                '--douze-name-in-delay': `${0.3 * durationScale}s`,
                '--douze-name-fade': `${0.4 * durationScale}s`,
                '--douze-name-out-delay': `${
                  HEARTS_SHRINK_PHASE_START_SECONDS * durationScale
                }s`,
                ...(sourceName !== null && {
                  ...sourceName.style,
                  flex: 'none',
                  width: sourceName.width,
                }),
              } as React.CSSProperties
            }
            data-douze-name=""
            className={`douze-country-name-animated relative z-50 text-countryItem-douzePointsText ${nameClassName}`}
          >
            {countryName}
          </h4>
        )}
      </div>
    </div>
  );
};

/** Spec-driven modes (src/douze/) render through `DouzeRowOverlay` instead. */
const DOUZE_POINTS_VARIANTS: Partial<
  Record<DouzePointsAnimationMode, React.FC<BaseVariantProps>>
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
  douzeOptionsOverride,
  entryColors,
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
  const { douzePointsAnimationMode, douzeOptions } = useThemeSpecifics();

  const resolvedDouzePointsAnimationMode =
    douzePointsAnimationModeOverride ?? douzePointsAnimationMode;
  const isSpecDouzePointsAnimationMode = !!getDouzeSpec(
    resolvedDouzePointsAnimationMode,
  );
  const isKnownDouzePointsAnimationMode =
    resolvedDouzePointsAnimationMode in DOUZE_POINTS_VARIANTS;
  const activeDouzePointsAnimationMode = isKnownDouzePointsAnimationMode
    ? resolvedDouzePointsAnimationMode
    : DEFAULT_THEME_SPECIFICS.douzePointsAnimationMode;
  // "Customize animation": only what this animation offers.
  const options = restrictDouzeOptions(
    douzeOptionsOverride !== undefined ? douzeOptionsOverride : douzeOptions,
    getDouzeOptionsSupport(activeDouzePointsAnimationMode),
  );

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

  if (!isDouzePoints || isSpecDouzePointsAnimationMode) return null;

  const SelectedVariant =
    DOUZE_POINTS_VARIANTS[activeDouzePointsAnimationMode] ??
    HeartsGridAnimation;

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
      durationScale={douzeDurationScale(options)}
      useFlagColors={options?.colors === 'flag'}
      entryColors={entryColors}
      off={new Set(options?.off)}
      coverFlag={!!options?.coverFlag}
    />
  );
};

export default DouzePointsAnimation;
