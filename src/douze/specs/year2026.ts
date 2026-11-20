import type { DouzeAnimationSpec, DouzeKeyframe, DouzeX } from '../model';

/**
 * The 2026 douze: gold sweeps the name strip from the flag's edge on into
 * the 12 box, holds, and retreats the way it came. Read frame by frame from
 * two broadcast clips (edges measured per frame, ±20 ms) and checked side
 * by side in /dev/douze-lab; the breakdown lives in the local issue tracker
 * (.scratch/douze-animations/2026/).
 *
 * Two changes from the broadcast, for the app's board:
 * - The row's order: in the broadcast it climbs while gold and the gold
 *   leaves when the next jury starts. Here the board keeps its own order
 *   (`reorder: 'before'`, as for the hearts): a teleporting board moves the
 *   row first and the gold plays at its new place; a flipping one moves it
 *   1 s in, while the gold holds.
 * - The 12 box: the broadcast's slides out gold from under the total. The
 *   app's box is already out by the time the gold comes (it enters with
 *   every award), so the gold sweeps on into it instead, and drains out of
 *   it first at the end.
 *
 * The gold is one colour (`c1`) with a metallic sheen mixed from its
 * `sheen` and `shade`, so flag, theme and custom colours keep the look;
 * text on it takes `ink`. It follows the row's shapes: on rounded rows the
 * strip's round end lies over the total, which lies over the 12 box. On
 * square rows the 12 box sits between the strip and the total, so the gold
 * takes the strip and the total there and leaves the box as it is.
 */

/** Positions of the gold's edge in the row. */
const FLAG_EDGE: DouzeX = { on: 'flag', at: 'right' };
/** The first frame's sliver of gold at the flag's edge. */
const SLIVER: DouzeX = { on: 'flag', at: 'right', offset: 0.01 };
const STRIP_END: DouzeX = { on: 'strip', at: 'right' };
/**
 * Past the row's right end by more than the round edge's radius (half a
 * row height): the points are gold whole, corners included, on any width.
 */
const PAST_ROW: DouzeX = { on: 'row', at: 'right', offsetRh: 0.6 };
/** The middle of the total: under it, nothing shows. */
const TOTAL_MIDDLE: DouzeX = { on: 'total', at: 'centre' };

/** Measured: 20 % at 100 ms, 45 % at 200, 90 % at 300, the end at 330. */
const IN_EASE = 'cubic-bezier(0.45, 0.15, 1, 1)';

/** When the gold starts to leave. */
const EXIT = 1990;

/**
 * The gold's edge over the strip, shared by the fill and the name over it.
 * In: from the flag's edge to the strip's end, easing in. Out, once the 12
 * box has drained into the total: back to the flag's edge in 370 ms,
 * near-linear with soft ends (measured: 23 % at 83 ms, 51 % at 150, 80 % at
 * 267). Then what's left round a small or round flag fades.
 */
const STRIP_EDGE: DouzeKeyframe[] = [
  { t: 0, opacity: 1, revealX: SLIVER, ease: IN_EASE },
  { t: 330, revealX: STRIP_END },
  {
    t: EXIT + 95,
    revealX: STRIP_END,
    ease: 'cubic-bezier(0.35, 0.2, 0.6, 0.9)',
  },
  { t: EXIT + 465, opacity: 1, revealX: FLAG_EDGE },
  { t: EXIT + 500, opacity: 0 },
];

/**
 * The gold's edge over the points at the row's right end (the 12 box on
 * rounded rows, the total on square ones): the strip's, carried on past
 * the row's end at the speed it arrived with. Out: drains right to left
 * just before the strip, then on to the flag.
 */
const BOX_EDGE: DouzeKeyframe[] = [
  { t: 0, opacity: 1, revealX: SLIVER, ease: IN_EASE },
  { t: 330, revealX: STRIP_END, ease: 'cubic-bezier(0.25, 0.5, 0.5, 1)' },
  { t: 430, revealX: PAST_ROW },
  { t: EXIT, revealX: PAST_ROW, ease: 'cubic-bezier(0.4, 0, 1, 1)' },
  { t: EXIT + 100, revealX: TOTAL_MIDDLE },
  { t: EXIT + 465, revealX: FLAG_EDGE },
];

/** The points' gold: lighter than the strip's, as the broadcast's 12 box. */
const POINTS_GOLD =
  'color-mix(in srgb, var(--douze-sheen) 55%, var(--douze-c1))';

/**
 * Keeps a halo off whatever lies left of its box at the row's height (the
 * 12 box's own left part, the total), so the box keeps one colour; above
 * and below the row it fades out as it is.
 */
const NO_LEFT_SPILL =
  'polygon(-100% -100%, 200% -100%, 200% 200%, -100% 200%, -100% 100%, 0% 100%, 0% 0%, -100% 0%)';

/** A white-gold halo round the gilded points. */
const HALO = '0 0 12px 2px color-mix(in srgb, var(--douze-glow) 60%, #ffffff)';

/** The halo flares as the gold reaches the points, then settles to a rim. */
const GLOW: DouzeKeyframe[] = [
  { t: 0, opacity: 0 },
  { t: 340, opacity: 0, ease: 'ease-out' },
  { t: 450, opacity: 0.9 },
  { t: 800, opacity: 0.5 },
  { t: EXIT, opacity: 0.5 },
  { t: EXIT + 70, opacity: 0 },
];

export const year2026Douze: DouzeAnimationSpec = {
  id: 'year2026',
  durationMs: EXIT + 510,
  // The board's own order, as for the hearts (useBoardAnimations waits 1 s
  // before it moves the row; a teleport plays the gold at the new place).
  reorder: 'before',
  parts: ['points'],
  // With theme colours the gold is the theme's douze colour.
  themeColors: ['douzePointsBg', 'juryLastPointsBg', 'juryCountryText'],
  palette: {
    // The broadcast's gold, sampled from the strip at rest.
    c1: '#eba52c',
    c2: '#eba52c',
    c3: '#eba52c',
    sheen: '#fcc562',
    shade: '#d98c08',
    glow: '#f8dfb5',
    ink: '#000000',
  },
  layers: [
    // 0–330 ms: the gold over the strip, revealed from the flag's edge with
    // a round edge (the strip's end shape); the sheen stays in place.
    {
      id: 'fill',
      kind: 'rect',
      fill:
        'linear-gradient(90deg, var(--douze-c1) 0%, var(--douze-c1) 19%, ' +
        'var(--douze-sheen) 29%, var(--douze-c1) 41%, var(--douze-shade) 50%, ' +
        'var(--douze-c1) 60%, var(--douze-sheen) 75%, var(--douze-c1) 88%, ' +
        'color-mix(in srgb, var(--douze-c1) 60%, var(--douze-shade)) 100%)',
      clipTo: 'strip',
      // The total and the 12 box stay on top on square rows, where they lie
      // over the strip (on rounded rows the strip lies over them). The flag
      // is drawn again over the gold instead of cut out of it: a cut leaves
      // a light seam at its edge.
      cutBy: ['total', 'lastPoints'],
      revealEdge: 'round',
      box: { anchor: 'strip' },
      keyframes: STRIP_EDGE,
    },
    // The flag over the gold, as in the row (the gold runs under it).
    {
      id: 'flag',
      kind: 'clone',
      source: 'flag',
      clipTo: 'row',
      box: { anchor: 'flag' },
      keyframes: [{ t: 0, opacity: 1 }],
    },
    // The name over the gold, in a colour that reads on it, on the gold's
    // own edge.
    {
      id: 'name',
      kind: 'clone',
      source: 'name',
      paint: { text: 'var(--douze-ink)' },
      revealEdge: 'round',
      box: { anchor: 'name' },
      keyframes: STRIP_EDGE,
    },

    // Rounded rows, 330–430 ms: the 12 box turns gold, a lighter gold, with
    // its "12" in ink: a gold copy over the real box (which stays, so the
    // drain shows it again). The strip and the total lie over the box and
    // are cut out of it.
    {
      id: 'box',
      group: 'points',
      layout: 'rounded',
      kind: 'clone',
      source: 'lastPoints',
      paint: { fill: POINTS_GOLD, text: 'var(--douze-ink)' },
      clipTo: 'row',
      cutBy: ['total', 'strip'],
      revealEdge: 'round',
      box: { anchor: 'lastPoints' },
      keyframes: BOX_EDGE,
    },
    {
      // A white-gold halo round the box as the gold reaches it, settling to
      // a rim. Only round the part the total doesn't cover, and nothing to
      // its left, so the box keeps one colour.
      id: 'glow',
      group: 'points',
      layout: 'rounded',
      intensity: 'glow',
      kind: 'rect',
      heavy: true,
      fill: 'transparent',
      radius: 'anchor',
      shadow: HALO,
      clipPath: NO_LEFT_SPILL,
      box: { anchor: 'lastPoints', w: 1, xRh: 0.38, wRh: -0.38 },
      keyframes: GLOW,
    },

    // Square rows: the total turns gold with the strip; the 12 box between
    // them keeps its colour (the strip's gold passes under it).
    {
      id: 'total',
      group: 'points',
      layout: 'square',
      kind: 'clone',
      source: 'total',
      paint: { fill: POINTS_GOLD, text: 'var(--douze-ink)' },
      clipTo: 'row',
      revealEdge: 'round',
      box: { anchor: 'total' },
      keyframes: BOX_EDGE,
    },
    {
      id: 'totalGlow',
      group: 'points',
      layout: 'square',
      intensity: 'glow',
      kind: 'rect',
      heavy: true,
      fill: 'transparent',
      radius: 'anchor',
      shadow: HALO,
      clipPath: NO_LEFT_SPILL,
      box: { anchor: 'total' },
      keyframes: GLOW,
    },
  ],
};
