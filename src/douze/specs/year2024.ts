import type { DouzeAnimationSpec } from '../model';

/**
 * The 2024 douze: one long band, yellow, magenta, yellow again, slides
 * through the whole row from left to right, slowing down as it goes, and
 * the row comes back behind it; "12 POINTS" rises into the middle as the
 * yellow arrives and rides out to the right ahead of the tail. Read from
 * two broadcast clips: every edge of both was measured per frame and
 * fitted at once (one rigid band, a constant deceleration, 7 px RMS on a
 * 589 px row), then checked side by side in /dev/douze-lab; the breakdown
 * lives in the local issue tracker (.scratch/douze-animations/2024/).
 *
 * The band covers the flag and the points too. The app's 12 box slides in
 * and the total counts up under it, and its tail uncovers them, as in the
 * broadcast. The row climbs afterwards (`reorder: 'after'`).
 *
 * Yellow is `c1` and magenta `c2`, the same for every country in the
 * broadcast; the caption takes `ink` (black or white for c1).
 */

/**
 * The band's stops, in row widths from the middle of its front's fade
 * (left is its tail). Measured on the broadcast row.
 */
const FRONT = 0.175;
/** Yellow → magenta, 0.49 row widths. */
const YM_YELLOW = -0.566;
const YM_MAGENTA = -1.056;
/** Magenta → yellow, 0.4 row widths. */
const MY_MAGENTA = -1.889;
const MY_YELLOW = -2.289;
/** The middle of the tail's fade. */
const TAIL_MIDDLE = -2.866;
const TAIL = -3.106;
const LENGTH = FRONT - TAIL;

/**
 * The front's and the tail's fades: [position, yellow's opacity], longer on
 * their clear side (both clips agree).
 */
const FRONT_FADE: [number, number][] = [
  [-0.115, 1],
  [-0.07, 0.84],
  [-0.03, 0.65],
  [0.01, 0.46],
  [0.05, 0.26],
  [0.09, 0.12],
  [0.13, 0.04],
  [FRONT, 0],
];
const TAIL_FADE: [number, number][] = [
  [-0.24, 0],
  [-0.21, 0.03],
  [-0.16, 0.09],
  [-0.11, 0.19],
  [-0.06, 0.31],
  [-0.01, 0.47],
  [0.04, 0.62],
  [0.09, 0.79],
  [0.17, 1],
].map(([u, alpha]) => [TAIL_MIDDLE + u, alpha]);

const at = (u: number) => `${(((u - TAIL) / LENGTH) * 100).toFixed(2)}%`;

const yellow = (alpha: number) =>
  alpha === 1
    ? 'var(--douze-c1)'
    : `color-mix(in srgb, var(--douze-c1) ${Math.round(
        alpha * 100,
      )}%, transparent)`;

/**
 * The colour changes blend in linear light, as the broadcast's do: the
 * middle of yellow → magenta is a pink, where an sRGB blend gives salmon.
 * Five stops along each change.
 */
const change = (from: number, to: number, fromC2: boolean) =>
  [0, 25, 50, 75, 100].map((step) => {
    const c2 = fromC2 ? 100 - step : step;
    const color =
      c2 === 0
        ? 'var(--douze-c1)'
        : c2 === 100
        ? 'var(--douze-c2)'
        : `color-mix(in srgb-linear, var(--douze-c2) ${c2}%, var(--douze-c1))`;

    return `${color} ${at(from + ((to - from) * step) / 100)}`;
  });

const BAND = `linear-gradient(90deg, ${[
  ...TAIL_FADE.map(([u, alpha]) => `${yellow(alpha)} ${at(u)}`),
  ...change(MY_YELLOW, MY_MAGENTA, false),
  ...change(YM_MAGENTA, YM_YELLOW, true),
  ...FRONT_FADE.map(([u, alpha]) => `${yellow(alpha)} ${at(u)}`),
].join(', ')})`;

/** Where the middle of the front's fade starts: just left of the row. */
const START = -0.191;

const DURATION = 2150;

/**
 * Row widths the band travels in DURATION: its tail has left the row by
 * then (under 1 % yellow at the row's end).
 */
const TRAVEL = 4.288;

/**
 * A constant deceleration (a quadratic, exact as this curve): 3.55 row
 * widths a second at the start, 0.26 at the end.
 */
const BAND_EASE = 'cubic-bezier(0.3333, 0.5936, 0.6667, 0.9269)';

/** The caption's rise: quick, with a long settle (fitted, both clips). */
const RISE = 'cubic-bezier(0.22, 1.05, 0.85, 0.95)';

/**
 * The caption's exit is a quadratic ease-in from EXIT_FROM (0.56 row widths
 * by 1570 ms, measured); it fades from FADE_FROM and is gone by EXIT_TO.
 * The move is split where the fade starts, so the fade doesn't bend it.
 */
const EXIT_FROM = 1065;
const FADE_FROM = 1400;
const EXIT_TO = 1550;
const exitX = (t: number) => 0.56 * ((t - EXIT_FROM) / (1570 - EXIT_FROM)) ** 2;
const FADE_SHARE = (FADE_FROM - EXIT_FROM) / (EXIT_TO - EXIT_FROM);

/** A quadratic ease-in (exact as this curve). */
const EASE_IN = 'cubic-bezier(0.3333, 0, 0.6667, 0.3333)';

/** The rest of a quadratic ease-in, from `share` of its time on. */
const easeInFrom = (share: number) => {
  // Its starting slope, as a share of the rest's average speed.
  const slope = (2 * share) / (1 + share);

  return `cubic-bezier(0.3333, ${(slope / 3).toFixed(4)}, 0.6667, ${(
    (slope + 1) /
    3
  ).toFixed(4)})`;
};

/** Dark ink over the band, as the broadcast's (the band shows through). */
const INK = 0.88;

export const year2024Douze: DouzeAnimationSpec = {
  id: 'year2024',
  durationMs: DURATION,
  reorder: 'after',
  parts: ['label'],
  // With theme colours: the douze colour, then the 12 box's.
  themeColors: ['douzePointsBg', 'juryLastPointsBg'],
  palette: {
    // Sampled flat from the broadcast.
    c1: '#efda19',
    c2: '#d93fc2',
    ink: '#000000',
  },
  layers: [
    {
      id: 'band',
      kind: 'rect',
      fill: BAND,
      clipTo: 'row',
      box: { anchor: 'row', x: START + TAIL, w: LENGTH },
      keyframes: [
        { t: 0, x: 0, ease: BAND_EASE },
        { t: DURATION, x: TRAVEL },
      ],
    },
    {
      // "12 POINTS", set like the names: rises from under the row's bottom
      // edge to its middle, holds, then slides out right, fading at the
      // row's end.
      id: 'label',
      group: 'label',
      kind: 'text',
      text: 'points',
      font: 'name',
      color: 'var(--douze-ink)',
      clipTo: 'row',
      box: { anchor: 'row' },
      keyframes: [
        { t: 0, opacity: 0, x: 0, y: 0.75, ease: 'steps(1, end)' },
        { t: 150, opacity: INK, y: 0.75, ease: RISE },
        { t: 505, y: 0 },
        { t: EXIT_FROM, x: 0, opacity: INK, ease: EASE_IN },
        {
          t: FADE_FROM,
          x: exitX(FADE_FROM),
          opacity: INK,
          ease: easeInFrom(FADE_SHARE),
        },
        { t: EXIT_TO, x: exitX(EXIT_TO), opacity: 0 },
      ],
    },
  ],
};
