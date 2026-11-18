import React, { CSSProperties, ReactNode, RefObject } from 'react';

import {
  CAP_W,
  CHIP_H,
  CHIP_W,
  CONNECTOR_H,
  FLAG_W,
  NAME_FONT,
  NAME_PAD_X,
  PILL_GAP,
  PILL_H,
  POINTS_FONT,
  RING_H,
  RING_STROKE,
  RING_W,
  TAG_FONT,
  TAG_H,
  TAG_INSET,
  TAG_MASK_H,
  TAG_PAD_X,
  TRACK_TOP_PAD,
  TRACK_W,
} from './ladderConstants';

import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { Country } from '@/models';
import { getHostingCountryLogo } from '@/theme/hosting';

/** `n` reference units as CSS. */
export const U = (n: number | string) => `calc(var(--u) * ${n})`;
/** A full rounding on rounded themes, square corners otherwise. */
const ROUND = (n: number) => `calc(var(--u) * ${n} * var(--round))`;
/** The dot's centre: 30 u outwards from the cap's inner end (§4.3). */
const DOT_CENTRE = 30;

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export type LadderSide = 'leader' | 'last';

/** Refs one side of the ladder animates. */
export interface LadderSideRefs {
  group: RefObject<HTMLDivElement | null>;
  tag: RefObject<HTMLDivElement | null>;
  winnerTag: RefObject<HTMLDivElement | null>;
  connector: RefObject<HTMLDivElement | null>;
  bodyClip: RefObject<HTMLDivElement | null>;
  nameSeg: RefObject<HTMLDivElement | null>;
  flag: RefObject<HTMLImageElement | null>;
  cap: RefObject<HTMLDivElement | null>;
  points: RefObject<HTMLSpanElement | null>;
  ringWrap: RefObject<HTMLDivElement | null>;
  ringPop: RefObject<HTMLDivElement | null>;
  ringPulse: RefObject<HTMLDivElement | null>;
  flash: RefObject<HTMLDivElement | null>;
  glow: RefObject<HTMLDivElement | null>;
  blur: RefObject<SVGFEGaussianBlurElement | null>;
  side: RefObject<HTMLDivElement | null>;
}

/** The pill's colours, from the theme's board colours (finished vs not). */
const PILL_CLASSES: Record<
  LadderSide,
  { nameBg: string; nameText: string; cap: string }
> = {
  leader: {
    nameBg: 'bg-countryItem-televoteFinishedBg',
    nameText: 'text-countryItem-televoteFinishedText',
    cap: 'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsText',
  },
  last: {
    nameBg: 'bg-countryItem-televoteUnfinishedBg',
    nameText: 'text-countryItem-televoteUnfinishedText',
    cap: 'bg-countryItem-televoteUnfinishedPointsBg text-countryItem-televoteUnfinishedPointsText',
  },
};

export const ACCENT_TAG_CLASSES =
  'bg-countryItem-douzePointsBg text-countryItem-douzePointsText';
export const TO_WIN_TAG_CLASSES =
  'bg-countryItem-televoteUnfinishedPointsBg text-countryItem-televoteUnfinishedPointsText';

/** One grapheme per span, so the name can resolve letter by letter. */
type GraphemeSegmenter = new (
  locale: undefined,
  options: { granularity: 'grapheme' },
) => { segment: (text: string) => Iterable<{ segment: string }> };

const splitGraphemes = (text: string): string[] => {
  const { Segmenter } = Intl as unknown as { Segmenter?: GraphemeSegmenter };

  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });

    return Array.from(segmenter.segment(text), (s) => s.segment);
  }

  return Array.from(text);
};

export const LadderTag = ({
  tagRef,
  className,
  style,
  inner,
  children,
}: {
  tagRef: RefObject<HTMLDivElement | null>;
  className: string;
  style?: CSSProperties;
  inner: 'left' | 'right';
  children: ReactNode;
}) => (
  <div
    ref={tagRef}
    className={`inline-flex items-center whitespace-nowrap font-extrabold uppercase leading-none ${className}`}
    style={{
      ...style,
      gridArea: '1 / 1',
      alignSelf: 'start',
      justifySelf: inner === 'right' ? 'end' : 'start',
      height: U(TAG_H),
      paddingInline: U(TAG_PAD_X),
      fontSize: U(TAG_FONT),
      letterSpacing: '0.04em',
      borderRadius: ROUND(TAG_H / 2),
    }}
  >
    {/* One inline run, so the spaces around the number survive the flex. */}
    <span>{children}</span>
  </div>
);

interface LadderPillProps {
  side: LadderSide;
  refs: LadderSideRefs;
  country: Country;
  label: string;
  points: number;
  place: number;
  uppercase: boolean;
  nameMax: number;
  nameStyle?: CSSProperties;
  /** The tag shown after the intro (CURRENT LEADER, TO WIN). */
  tag: ReactNode;
  tagClassName: string;
  tagStyle?: CSSProperties;
  winnerLabel: string;
  winnerStyle?: CSSProperties;
  blurId: string;
}

/**
 * One country's pill, docked beside the ladder: cap (points) → flag → name,
 * outwards from the ladder, with its tags rising out of its top edge. The
 * group moves between places through `--place`.
 */
export const LadderPill = ({
  side,
  refs,
  country,
  label,
  points,
  place,
  uppercase,
  nameMax,
  nameStyle,
  tag,
  tagClassName,
  tagStyle,
  winnerLabel,
  winnerStyle,
  blurId,
}: LadderPillProps) => {
  // The leader sits left of the ladder, so its ladder side is its right.
  const inner = side === 'leader' ? 'right' : 'left';
  const outer = side === 'leader' ? 'left' : 'right';
  const classes = PILL_CLASSES[side];
  const nameBox = (
    <div
      className={`flex h-full flex-none items-center ${classes.nameBg}`}
      style={{
        ...nameStyle,
        paddingInline: U(NAME_PAD_X),
        [`borderTop${capitalize(outer)}Radius`]: ROUND(PILL_H / 2),
        [`borderBottom${capitalize(outer)}Radius`]: ROUND(PILL_H / 2),
      }}
    >
      <span
        className={`block truncate font-extrabold leading-none ${
          uppercase ? 'uppercase' : ''
        }`}
        style={{ fontSize: U(NAME_FONT), maxWidth: nameMax }}
      >
        {splitGraphemes(label).map((char, index) => (
          <span
            // A name's letters never reorder.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            data-ladder-char=""
            className="inline-block whitespace-pre"
          >
            {char}
          </span>
        ))}
      </span>
    </div>
  );
  // The name's background runs on under the flag and the cap, so nothing
  // shows through while the flag slides. It keeps the colour the name ends
  // with (the inner end of a gradient), and stays a pixel inside the pill's
  // top and bottom edges, so it never shows as a hairline along the edges of
  // the flag and the cap above it.
  const filler = (
    <div
      className={classes.nameBg}
      style={{
        ...nameStyle,
        backgroundSize: '1000% 100%',
        backgroundPosition: inner,
        width: U(FLAG_W + CAP_W - DOT_CENTRE),
        marginBlock: 1,
      }}
    />
  );

  return (
    <div
      ref={refs.group}
      className="absolute"
      style={
        {
          '--place': place,
          [inner]: `calc(50% + ${U(TRACK_W / 2 + PILL_GAP)})`,
          top: `calc(var(--row1) - ${U(PILL_H / 2)})`,
          transform: 'translateY(calc((var(--place) - 1) * var(--pitch)))',
          zIndex: side === 'last' ? 3 : 2,
        } as CSSProperties
      }
    >
      <div
        className="absolute bottom-full grid overflow-hidden"
        style={{ [inner]: U(TAG_INSET), height: U(TAG_MASK_H) }}
      >
        <LadderTag
          tagRef={refs.tag}
          className={tagClassName}
          style={tagStyle}
          inner={inner}
        >
          {tag}
        </LadderTag>
        <LadderTag
          tagRef={refs.winnerTag}
          className={ACCENT_TAG_CLASSES}
          style={winnerStyle}
          inner={inner}
        >
          {winnerLabel}
        </LadderTag>
      </div>

      <div className="relative" style={{ height: U(PILL_H) }}>
        {/* Joins the cap to the ring; behind the cap. */}
        <div
          ref={refs.connector}
          className="absolute top-1/2 -translate-y-1/2 bg-countryItem-televoteFinishedPlaceText"
          style={{
            [outer]: `calc(100% - ${U(20)})`,
            width: 'calc(var(--u) * (85 - 42 * var(--k)))',
            height: U(CONNECTOR_H),
          }}
        />
        <div
          ref={refs.bodyClip}
          className="relative h-full overflow-hidden"
          style={{
            [`margin${capitalize(inner)}`]: U(DOT_CENTRE),
            // The body runs on under the cap, past where the cap's round end
            // starts curving; rounded the same way, it stays inside the
            // curve instead of showing its square corners around it.
            [`borderTop${capitalize(inner)}Radius`]: ROUND(PILL_H / 2),
            [`borderBottom${capitalize(inner)}Radius`]: ROUND(PILL_H / 2),
          }}
        >
          <div
            ref={refs.nameSeg}
            className={`flex h-full ${classes.nameText} ${
              side === 'last' ? 'flex-row-reverse' : ''
            }`}
          >
            {nameBox}
            {filler}
          </div>
          <img
            ref={refs.flag}
            src={getFlagPath(country)}
            onError={(e) => handleFlagError(e.currentTarget, country)}
            alt=""
            draggable={false}
            className="absolute top-0 h-full object-cover"
            style={{ [inner]: U(CAP_W - DOT_CENTRE), width: U(FLAG_W) }}
          />
        </div>
        <div
          ref={refs.cap}
          className={`absolute top-0 flex h-full items-center justify-center ${classes.cap}`}
          style={
            {
              '--cap-w': CAP_W,
              '--cap-flat': 0,
              [inner]: 0,
              zIndex: 2,
              width: 'calc(var(--u) * var(--cap-w))',
              // Round on the ladder side; the flag side squares off as the
              // dot widens into the cap.
              [`borderTop${capitalize(inner)}Radius`]: ROUND(PILL_H / 2),
              [`borderBottom${capitalize(inner)}Radius`]: ROUND(PILL_H / 2),
              [`borderTop${capitalize(outer)}Radius`]:
                'calc(var(--u) * 42 * var(--round) * var(--cap-flat))',
              [`borderBottom${capitalize(outer)}Radius`]:
                'calc(var(--u) * 42 * var(--round) * var(--cap-flat))',
            } as CSSProperties
          }
        >
          <span
            ref={refs.points}
            className="font-extrabold leading-none tabular-nums"
            style={{ fontSize: U(POINTS_FONT) }}
          >
            {points}
          </span>
        </div>
      </div>

      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter
          id={blurId}
          x="-15%"
          y="-40%"
          width="130%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur ref={refs.blur} stdDeviation="0 0" />
        </filter>
      </svg>
    </div>
  );
};

/**
 * The white ring around a pill's place, with the heartbeat's flash and glow
 * inside it. It sits under the numerals, so the flash brightens the chip
 * while the numeral stays readable.
 */
export const LadderRing = ({
  refs,
  place,
}: {
  refs: LadderSideRefs;
  place: number;
}) => (
  <div
    ref={refs.ringWrap}
    className="pointer-events-none absolute left-1/2"
    style={
      {
        '--place': place,
        top: U(TRACK_TOP_PAD),
        transform:
          'translate(-50%, -50%) translateY(calc((var(--place) - 1) * var(--pitch)))',
      } as CSSProperties
    }
  >
    <div ref={refs.ringPop}>
      <div
        ref={refs.ringPulse}
        className="relative"
        style={{
          width: `calc(var(--u) * ${RING_W} * var(--k))`,
          height: `calc(var(--u) * ${RING_H} * var(--k))`,
        }}
      >
        <div
          ref={refs.glow}
          className="absolute inset-0"
          style={{
            borderRadius: ROUND(RING_H),
            boxShadow: `0 0 ${U(18)} ${U(
              4,
            )} hsl(var(--twc-countryItem-televoteFinishedPlaceText) / 0.65)`,
          }}
        />
        <div
          ref={refs.flash}
          className="absolute bg-countryItem-televoteFinishedPlaceText"
          style={{
            inset: `calc(var(--u) * ${RING_STROKE} * var(--k))`,
            borderRadius: ROUND(RING_H),
          }}
        />
        <div
          className="absolute inset-0 border-solid border-countryItem-televoteFinishedPlaceText"
          style={{
            borderWidth: `max(1.5px, calc(var(--u) * ${RING_STROKE} * var(--k)))`,
            borderRadius: ROUND(RING_H),
          }}
        />
      </div>
    </div>
  </div>
);

/** One numeral per place, on its darker chip. */
export const LadderPlaces = ({ total }: { total: number }) => (
  <>
    {Array.from({ length: total }, (_, index) => (
      <div
        key={index}
        data-ladder-place=""
        className="absolute left-1/2 flex items-center justify-center font-extrabold leading-none tabular-nums text-countryItem-televoteFinishedPlaceText"
        style={{
          top: `calc(var(--u) * ${TRACK_TOP_PAD} + var(--pitch) * ${index})`,
          transform: 'translate(-50%, -50%)',
          width: `calc(var(--u) * ${CHIP_W} * var(--k))`,
          height: `calc(var(--u) * ${CHIP_H} * var(--k))`,
          borderRadius: ROUND(CHIP_H),
          background: 'rgb(0 0 0 / 0.22)',
          fontSize: 'calc(var(--pitch) * 0.505)',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>
    ))}
  </>
);

/**
 * A side of the panel: the country's big flag (or its heart logo), fading
 * into the page towards the ladder. The sides never swap.
 */
export const LadderSideFlag = ({
  sideRef,
  side,
  country,
  showHeart,
  whiteHearts,
}: {
  sideRef: RefObject<HTMLDivElement | null>;
  side: LadderSide;
  country: Country;
  showHeart: boolean;
  whiteHearts: boolean;
}) => {
  const isLeft = side === 'leader';
  const heart = getHostingCountryLogo(country, showHeart, whiteHearts);
  // A flag fades out towards the ladder and the panel's edges: no box, just
  // the flag melting into the page. A heart logo stays solid.
  const mask = heart.isExisting
    ? undefined
    : `radial-gradient(ellipse 85% 72% at ${
        isLeft ? '40%' : '60%'
      } 50%, #000 35%, transparent 100%)`;

  return (
    <div
      ref={sideRef}
      className={`pointer-events-none absolute inset-y-0 ${
        isLeft ? 'left-0' : 'right-0'
      }`}
      style={{
        width: `calc(50% - ${U(TRACK_W / 2 + 30)})`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    >
      {heart.isExisting ? (
        <img
          src={heart.logo}
          alt=""
          draggable={false}
          className="absolute left-1/2 top-1/2 h-[62%] w-[80%] -translate-x-1/2 -translate-y-1/2 object-contain"
        />
      ) : (
        <img
          src={getFlagPath(country)}
          onError={(e) => handleFlagError(e.currentTarget, country)}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
      )}
    </div>
  );
};

/**
 * Off-screen copies of every text whose width decides the fit, at 100px so
 * `useLadderLayout` can turn them into reference units.
 */
export const LadderMeasurer = ({
  measureRef,
  texts,
  uppercase,
}: {
  measureRef: RefObject<HTMLDivElement | null>;
  texts: Record<string, ReactNode>;
  uppercase: boolean;
}) => (
  <div
    ref={measureRef}
    aria-hidden
    className="pointer-events-none invisible absolute left-0 top-0 flex flex-col items-start whitespace-nowrap font-extrabold leading-none"
  >
    {Object.entries(texts).map(([key, text]) => {
      const isTag = key.startsWith('tag');

      return (
        <span
          key={key}
          data-measure={key}
          className={isTag || uppercase ? 'uppercase' : undefined}
          style={{
            fontSize: 100,
            letterSpacing: isTag ? '0.04em' : undefined,
          }}
        >
          {text}
        </span>
      );
    })}
  </div>
);
