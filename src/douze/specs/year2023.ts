import type {
  DouzeAnimationSpec,
  DouzeKeyframe,
  DouzeLayer,
  DouzeTextLayer,
} from '../model';

/**
 * The 2023 douze: three circles, magenta, blue and yellow, grow out of the
 * row's bottom-left corner one after the other and sweep the whole row; the
 * yellow one stays, with "12 POINTS" revealed by its front. Then giant
 * words, "12 POINTS" and the country's name, cut in and out on broadcast
 * frames, first over the yellow, and once the yellow cuts away, a shorter
 * run over the row. Read from three broadcast clips (the same animation
 * frame for frame) and checked side by side in /dev/douze-lab; the
 * breakdown lives in the local issue tracker (.scratch/douze-animations/2023/).
 *
 * The same colours for every country in the broadcast: yellow `c1` (the
 * fill), magenta `c2` (the first circle and the small text), blue `c3`.
 * Navy words are `ink` tinted with c3 (the broadcast's navy over the
 * yellow), so they stay readable on any fill. The row climbs afterwards
 * (`reorder: 'after'`); the broadcast's flag-coloured trail under the
 * climbing row belongs to the board's move and isn't drawn.
 */

/**
 * The circles, measured on the broadcast row (578 × 60 px) and fitted at
 * once (11 px RMS, the stream's uneven frames included): radius
 * r(τ) = v·τ − D·τ² px at τ ms after a circle's birth, centred on the row's
 * left edge at CY(r) px from its top. The centre starts on the bottom edge
 * and rises as the circle grows, which turns its front from a quarter
 * circle into the 2023 "/" slant by the row's end.
 */
const ROW_W = 578;
const ROW_H = 60;
const D = 0.001137;
const CY = (r: number) => 60 - 0.6485 * Math.max(0, r - 80.8) ** 0.913;

/**
 * Each circle is an ellipse sized in row widths across and in row heights
 * down, a circle on the broadcast row's 9.6 : 1, so its front crosses any
 * row on time. Its box is the full size; `scale` grows it.
 */
const SEMI_W = 1.25;
const SEMI_H = SEMI_W * (ROW_W / ROW_H);

/** Grown to 1.2 row widths: it covers the row whole, corners included. */
const MAX_R = 1.2 * ROW_W;

/** Keyframe step for the generated tracks. */
const STEP = 20;

/** When the yellow, and every circle under it, cuts away. */
const CUT = 1332;

const DURATION = 1650;

const radius = (v: number, age: number) => Math.max(0, v * age - D * age * age);

/** The circle's age when it reaches MAX_R. */
const grownAt = (v: number) => (v - Math.sqrt(v * v - 4 * D * MAX_R)) / (2 * D);

const round = (value: number, places = 4) =>
  Math.round(value * 10 ** places) / 10 ** places;

/** Ages along a circle's growth, every STEP ms and its last moment. */
const ages = (v: number) => {
  const end = grownAt(v);
  const list: number[] = [];

  for (let age = 0; age < end; age += STEP) list.push(age);

  return [...list, end];
};

const circle = (
  id: string,
  color: string,
  birth: number,
  v: number,
): DouzeLayer => {
  const grow = ages(v).map((age) => {
    const r = Math.max(0.5, radius(v, age));

    return {
      t: round(birth + age, 1),
      scale: round(r / (SEMI_W * ROW_W)),
      // From the row's bottom edge (the box's centre) to the centre.
      y: round(CY(r) / ROW_H - 1),
    };
  });
  const last = grow[grow.length - 1];

  return {
    id,
    kind: 'rect',
    fill: color,
    radius: '50%',
    clipTo: 'row',
    box: {
      anchor: 'row',
      x: -SEMI_W,
      w: 2 * SEMI_W,
      y: 1,
      yRh: -SEMI_H,
      hRh: 2 * SEMI_H,
    },
    keyframes: [
      ...(birth > 0
        ? [{ t: 0, opacity: 0, scale: grow[0].scale, ease: 'steps(1, end)' }]
        : []),
      { ...grow[0], opacity: 1 },
      ...grow.slice(1, -1),
      { ...last, opacity: 1, ease: 'steps(1, end)' },
      { t: CUT, opacity: 0 },
    ],
  };
};

const MAGENTA_V = 2.509;
const BLUE_V = 2.373;
const YELLOW_V = 2.23;
const YELLOW_BIRTH = 130;

/**
 * The yellow's front across the row's middle, in row widths: what reveals
 * the "12 POINTS" on it.
 */
const yellowFront = (): DouzeKeyframe[] =>
  ages(YELLOW_V).map((age) => {
    const r = radius(YELLOW_V, age);
    const dy = ROW_H / 2 - CY(r);
    const front = r > Math.abs(dy) ? Math.sqrt(r * r - dy * dy) / ROW_W : 0;

    return { t: round(YELLOW_BIRTH + age, 1), revealX: round(front) };
  });

/** Shown from `on` to `off`, for each pair: hard cuts, as broadcast frames. */
const cuts = (...times: [number, number][]): DouzeKeyframe[] => [
  { t: 0, opacity: 0, ease: 'steps(1, end)' },
  ...times.flatMap(([on, off]) => [
    { t: on, opacity: 1, ease: 'steps(1, end)' },
    { t: off, opacity: 0, ease: 'steps(1, end)' },
  ]),
];

/** The broadcast's navy over the yellow: ink with a little of the blue. */
const NAVY = 'color-mix(in srgb, var(--douze-ink) 65%, var(--douze-c3))';

/** A word card: clipped to the row, set like the names. */
const card = (
  id: string,
  layer: Pick<DouzeTextLayer, 'text' | 'color' | 'size' | 'align' | 'box'>,
  ...times: [number, number][]
): DouzeTextLayer => ({
  id,
  kind: 'text',
  group: 'flashText',
  font: 'name',
  clipTo: 'row',
  ...layer,
  keyframes: cuts(...times),
});

/** The small "12 POINTS" on the yellow. */
const LABEL_SIZE = 0.62;

/** The one-frame slice of yellow ahead of its front ("INT"). */
const SLICE = { x: 0.52, w: 0.09 };
const SLICE_ON = 135;
const SLICE_OFF = 175;

export const year2023Douze: DouzeAnimationSpec = {
  id: 'year2023',
  durationMs: DURATION,
  reorder: 'after',
  // A two-colour flag's blue words take its second colour, not the fill's.
  twoColorFlagC3: 'second',
  parts: ['label', 'flashText'],
  // With theme colours: the douze colour, its text and the first block
  // (the 2023 theme's yellow, magenta and blue).
  themeColors: ['douzePointsBg', 'douzePointsText', 'douzePointsBlock1'],
  palette: {
    // Sampled flat from the broadcast.
    c1: '#fef700',
    c2: '#fc008c',
    c3: '#0042fc',
    ink: '#000000',
  },
  layers: [
    circle('magenta', 'var(--douze-c2)', 0, MAGENTA_V),
    circle('blue', 'var(--douze-c3)', 50, BLUE_V),
    circle('yellow', 'var(--douze-c1)', YELLOW_BIRTH, YELLOW_V),
    {
      id: 'slice',
      group: 'label',
      kind: 'rect',
      fill: 'var(--douze-c1)',
      clipTo: 'row',
      clipPath: 'polygon(12% 0, 100% 0, 88% 100%, 0 100%)',
      box: { anchor: 'row', ...SLICE },
      keyframes: cuts([SLICE_ON, SLICE_OFF]),
    },
    {
      // What the slice shows of the text: the same line, cut to it.
      id: 'sliceLabel',
      group: 'label',
      kind: 'text',
      text: 'points',
      font: 'name',
      size: LABEL_SIZE,
      color: 'var(--douze-c2)',
      clipTo: 'row',
      clipPath: `polygon(${(SLICE.x + 0.12 * SLICE.w) * 100}% 0, ${
        (SLICE.x + SLICE.w) * 100
      }% 0, ${(SLICE.x + 0.88 * SLICE.w) * 100}% 100%, ${SLICE.x * 100}% 100%)`,
      box: { anchor: 'row' },
      keyframes: cuts([SLICE_ON, SLICE_OFF]),
    },
    {
      // "12 POINTS", revealed by the yellow's front, until the words come.
      id: 'label',
      group: 'label',
      kind: 'text',
      text: 'points',
      font: 'name',
      size: LABEL_SIZE,
      color: 'var(--douze-c2)',
      clipTo: 'row',
      box: { anchor: 'row' },
      keyframes: [
        { t: 0, opacity: 1, revealX: 0 },
        ...yellowFront(),
        { t: 932, opacity: 1, ease: 'steps(1, end)' },
        { t: 965, opacity: 0 },
      ],
    },
    // The words, in the broadcast's stacking order (later ones on top).
    card(
      'bigPoints',
      {
        text: 'points',
        color: 'var(--douze-c3)',
        size: 3.3,
        align: 'left',
        box: { anchor: 'row' },
      },
      [765, 932],
    ),
    card(
      'points',
      {
        text: 'points',
        color: NAVY,
        size: 2.1,
        align: 'left',
        box: { anchor: 'row' },
      },
      [932, 965],
    ),
    card(
      'pointsFlash',
      {
        text: 'points',
        color: '#ffffff',
        size: 2.1,
        align: 'left',
        box: { anchor: 'row' },
      },
      [965, 1032],
    ),
    card(
      'nameSmall',
      {
        text: 'name',
        color: 'var(--douze-c3)',
        size: 0.83,
        align: 'left',
        box: { anchor: 'name', anchorY: 'row', yRh: 0.12 },
      },
      [1165, 1248],
      [1482, 1648],
    ),
    card(
      'nameMid',
      {
        text: 'name',
        color: 'var(--douze-c2)',
        size: 1.15,
        align: 'left',
        box: { anchor: 'row', x: 0.06, yRh: -0.07 },
      },
      [1082, 1248],
      [1415, 1582],
    ),
    card(
      'nameBig',
      {
        text: 'name',
        color: NAVY,
        size: 2.4,
        align: 'left',
        box: { anchor: 'row', x: 0.018 },
      },
      [965, 1148],
      [1365, 1482],
    ),
    card(
      'pointsLow',
      {
        text: 'points',
        color: NAVY,
        size: 1.3,
        align: 'left',
        box: { anchor: 'row', x: 0.08, yRh: 0.38 },
      },
      [1248, 1282],
    ),
    card(
      'bigPointsEnd',
      {
        text: 'points',
        color: 'var(--douze-c3)',
        size: 3.2,
        align: 'right',
        box: { anchor: 'row', w: 1.04 },
      },
      [1282, 1365],
    ),
  ],
};
