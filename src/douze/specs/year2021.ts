import type {
  DouzeAnimationSpec,
  DouzeKeyframe,
  DouzeSlabLine,
} from '../model';

/**
 * The 2021 douze: the row pops out of the board as a slab. Its face comes
 * toward the camera (a zoom about a point far below and right of the row,
 * so it grows up and to the left) with its bottom side in the flag's first
 * colour and its right side in the second, settles a quarter of a row
 * height up and to the left, holds, and lands: it rises once more and
 * drops flat. On a flipping board the row flies to its new place while
 * raised (`moveAtMs`), as in the broadcast. Read from three broadcast clips
 * (the same animation in each) and checked side by side in /dev/douze-lab;
 * the breakdown lives in the local issue tracker
 * (.scratch/douze-animations/2021/).
 *
 * The face is the row itself (a `part` layer), so the app's own 12 box
 * entrance, the total's count-up and the name stay live in it; the sides
 * are drawn around it every frame (`slabSides`).
 */

/** Keyframe step for the generated tracks. */
const STEP = 20;

const DURATION = 2780;

/**
 * The vanishing point the face zooms about, as the row's transform-origin:
 * 1.7 row widths from its left edge, 4.6 row heights from its top (fitted
 * on the pop, where the face only zooms: within 0.02 row heights).
 */
const ORIGIN = '170% 460%';

/**
 * The face's zoom (k − 1), measured frame by frame on the broadcast (ms
 * from the first changed frame): a fast pop to 1.12, back to 1 with a slow
 * tail, then the landing's smaller rise and the drop.
 */
const ZOOM: [number, number][] = [
  [0, 0],
  [60, 0],
  [100, 0.032],
  [133, 0.06],
  [167, 0.09],
  [217, 0.106],
  [250, 0.116],
  [300, 0.1225],
  [333, 0.12],
  [367, 0.106],
  [417, 0.084],
  [450, 0.063],
  [500, 0.042],
  [533, 0.031],
  [583, 0.024],
  [650, 0.014],
  [700, 0.006],
  [750, 0],
  [2300, 0],
  [2400, 0.01],
  [2500, 0.021],
  [2560, 0.04],
  [2617, 0.055],
  [2660, 0.049],
  [2700, 0.04],
  [2735, 0.02],
  [2770, 0],
];

/**
 * The face's move in row heights, across (x) and down (y): none while it
 * zooms, then up and to the left in two steps to a quarter of a row height
 * (a 45° lift), held; the landing pulls it further up and left before the
 * drop.
 */
const LIFT_X: [number, number][] = [
  [0, 0],
  [380, 0],
  [417, -0.02],
  [450, -0.065],
  [500, -0.125],
  [533, -0.15],
  [583, -0.156],
  [633, -0.162],
  [667, -0.18],
  [700, -0.212],
  [740, -0.235],
  [2330, -0.235],
  [2400, -0.245],
  [2450, -0.265],
  [2500, -0.3],
  [2533, -0.355],
  [2567, -0.405],
  [2617, -0.443],
  [2650, -0.37],
  [2700, -0.212],
  [2735, 0],
  [2770, 0],
];

const LIFT_Y: [number, number][] = [
  [0, 0],
  [320, 0],
  [367, -0.03],
  [417, -0.06],
  [450, -0.12],
  [500, -0.17],
  [533, -0.198],
  [583, -0.205],
  [633, -0.212],
  [667, -0.225],
  [700, -0.252],
  [740, -0.262],
  [2330, -0.262],
  [2450, -0.272],
  [2500, -0.287],
  [2533, -0.302],
  [2567, -0.307],
  [2617, -0.317],
  [2650, -0.272],
  [2700, -0.114],
  [2735, 0],
  [2770, 0],
];

/**
 * A smooth curve through the points that never overshoots them (monotone
 * cubic, Fritsch–Carlson), so a hold stays a hold and a rise doesn't dip.
 */
export const monotoneCurve = (
  points: [number, number][],
): ((t: number) => number) => {
  const n = points.length;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const slopes = xs
    .slice(0, -1)
    .map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const tangents = xs.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    if (slopes[i - 1] * slopes[i] <= 0) return 0;

    return (slopes[i - 1] + slopes[i]) / 2;
  });

  slopes.forEach((slope, i) => {
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;

      return;
    }

    const a = tangents[i] / slope;
    const b = tangents[i + 1] / slope;
    const length = Math.hypot(a, b);

    if (length > 3) {
      tangents[i] = (3 * a * slope) / length;
      tangents[i + 1] = (3 * b * slope) / length;
    }
  });

  return (t) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];

    let i = 0;

    while (t > xs[i + 1]) i += 1;

    const h = xs[i + 1] - xs[i];
    const s = (t - xs[i]) / h;

    return (
      (2 * s ** 3 - 3 * s ** 2 + 1) * ys[i] +
      (s ** 3 - 2 * s ** 2 + s) * h * tangents[i] +
      (-2 * s ** 3 + 3 * s ** 2) * ys[i + 1] +
      (s ** 3 - s ** 2) * h * tangents[i + 1]
    );
  };
};

const round = (value: number, places = 4) =>
  Math.round(value * 10 ** places) / 10 ** places;

/**
 * The row's keyframes, every STEP ms while it moves and only the ends of
 * its hold: linear between them, so the sides' painter, which samples the
 * same keyframes, stays on the face to the pixel.
 */
const rowKeyframes = (): DouzeKeyframe[] => {
  const zoom = monotoneCurve(ZOOM);
  const liftX = monotoneCurve(LIFT_X);
  const liftY = monotoneCurve(LIFT_Y);
  const times = new Set<number>();
  const moving = [
    [0, 760],
    [2280, DURATION],
  ];

  moving.forEach(([from, to]) => {
    for (let t = from; t < to; t += STEP) times.add(t);
    times.add(to);
  });

  return [...times]
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      scale: round(1 + zoom(t)),
      // Across in row heights: a placement on the row's own left edge.
      x: { on: 'row', offsetRh: round(liftX(t)) },
      y: round(liftY(t)),
    }));
};

/**
 * The light lines across the bottom side, at fixed places on the face
 * (both clips), and a long one from the face's bottom-left corner.
 */
const LINES: DouzeSlabLine[] = [
  { at: 0, slant: 1.9 },
  { at: 0.104, slant: 0.25 },
  { at: 0.163, slant: 0 },
  { at: 0.409, slant: 0.5 },
  { at: 0.593, slant: 0.4 },
  { at: 0.696, slant: -0.2 },
];

/** Where the sides can reach: the row, its lift and the peak's zoom. */
const SIDES_BOX = {
  anchor: 'row',
  x: -0.4,
  w: 1.4,
  yRh: -1,
  h: 1,
  hRh: 1,
} as const;

export const year2021Douze: DouzeAnimationSpec = {
  id: 'year2021',
  durationMs: DURATION,
  reorder: 'before',
  // The broadcast's move: the row flies raised and lands after it.
  moveAtMs: 1700,
  raise: true,
  paletteFrom: 'flag',
  // The flags' own blues, as the broadcast's sides; only near-black is
  // lifted (it would vanish into the board).
  liftBelow: 0.03,
  // With theme colours: the douze colour, then the 12 box's.
  themeColors: ['douzePointsBg', 'juryLastPointsBg'],
  parts: ['lines'],
  palette: {
    // Fallbacks for a flag that can't be read: the 2021 theme's pinks.
    c1: '#e05fb8',
    c2: '#f08fd1',
    c3: '#e05fb8',
    glow: '#f6cfe9',
  },
  layers: [
    {
      id: 'row',
      kind: 'part',
      part: 'row',
      box: { anchor: 'row' },
      origin: ORIGIN,
      keyframes: rowKeyframes(),
    },
    {
      id: 'sides',
      kind: 'canvas',
      painter: {
        type: 'slabSides',
        follow: 'row',
        colors: ['var(--douze-c1)', 'var(--douze-c2)'],
      },
      box: SIDES_BOX,
      keyframes: [{ t: 0 }],
    },
    {
      id: 'lines',
      group: 'lines',
      kind: 'canvas',
      painter: {
        type: 'slabLines',
        follow: 'row',
        colors: ['var(--douze-c1)'],
        lines: LINES,
        width: 0.03,
      },
      box: SIDES_BOX,
      keyframes: [{ t: 0 }],
    },
  ],
};
