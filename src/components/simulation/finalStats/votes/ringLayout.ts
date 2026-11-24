/**
 * Where the Votes view's flags go: the country in the middle, the others on
 * an ellipse fitted to the free area, sized by their points (area grows with
 * the points), biggest at 12 o'clock and clockwise from there. Pure, so the
 * fitting can be tested without a browser.
 */

export interface RingInput {
  width: number;
  height: number;
  /** Points per flag, in ring order (biggest first). */
  points: readonly number[];
  /** The stage's biggest single link: a flag of this many points is the largest. */
  maxPoints: number;
  /** Room is kept outside the flags for the jury and televote pills. */
  pills: boolean;
}

export interface RingSlot {
  x: number;
  y: number;
  /** Diameter. */
  d: number;
  /** The outward normal at the slot, radians (screen space: y down). */
  normal: number;
}

export interface RingLayout {
  cx: number;
  cy: number;
  /** The middle flag's diameter. */
  center: number;
  /** The ring's semi-axes. */
  a: number;
  b: number;
  slots: RingSlot[];
  /** A uniform size the flags travel at between two views. */
  travel: number;
  /**
   * The flags stand too close for their jury and televote pills: they would
   * cover the neighbours (a full final on a phone).
   */
  crowded: boolean;
  /** Ring length per flag: how far apart neighbours' centres are. */
  pitch: number;
}

/** Ring length per flag under which the pills don't fit beside it. */
const CROWDED_ARC = 44;

const SAMPLES = 720;
const GAP = 5;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Cumulative arc length along the ellipse from 12 o'clock, clockwise. */
const arcTable = (a: number, b: number) => {
  const lengths = new Float64Array(SAMPLES + 1);
  let prevX = 0;
  let prevY = -b;

  for (let i = 1; i <= SAMPLES; i += 1) {
    const t = -Math.PI / 2 + (i / SAMPLES) * Math.PI * 2;
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);

    lengths[i] = lengths[i - 1] + Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }

  return lengths;
};

/** The ellipse parameter `t` at arc length `s` (wrapping round). */
const paramAt = (lengths: Float64Array, s: number) => {
  const total = lengths[SAMPLES];
  const target = ((s % total) + total) % total;
  let lo = 0;
  let hi = SAMPLES;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;

    if (lengths[mid] < target) lo = mid;
    else hi = mid;
  }

  const span = lengths[hi] - lengths[lo] || 1;
  const fraction = lo + (target - lengths[lo]) / span;

  return -Math.PI / 2 + (fraction / SAMPLES) * Math.PI * 2;
};

/** Diameters for `points` between `min` and `max` (area ∝ points). */
const diameters = (
  points: readonly number[],
  maxPoints: number,
  min: number,
  max: number,
) =>
  points.map(
    (p) =>
      min +
      (max - min) * Math.sqrt(clamp(maxPoints > 0 ? p / maxPoints : 1, 0, 1)),
  );

export function layoutRing({
  width,
  height,
  points,
  maxPoints,
  pills,
}: RingInput): RingLayout {
  const cx = width / 2;
  const cy = height / 2;
  const short = Math.max(0, Math.min(width, height));
  // Pills sit just outside the flags.
  const pad = pills ? 24 : 6;

  let largest = clamp(short * 0.12, 34, 74);
  let smallest = clamp(largest * 0.5, 18, 34);
  let center = clamp(short * 0.22, 64, 150);
  let sizes = diameters(points, maxPoints, smallest, largest);
  let a = 0;
  let b = 0;
  let lengths = arcTable(1, 1);

  // Fit: shrink the flags until the ring holds them all, a few passes since
  // the ellipse itself grows as the flags shrink.
  for (let pass = 0; pass < 6; pass += 1) {
    const ring = sizes.length ? Math.max(...sizes) : smallest;

    a = Math.max(8, cx - pad - ring / 2);
    b = Math.max(8, cy - pad - ring / 2);
    lengths = arcTable(a, b);

    const perimeter = lengths[SAMPLES];
    const needed = sizes.reduce((sum, d) => sum + d + GAP, 0);

    if (needed <= perimeter || largest <= 14) break;

    const scale = Math.max(0.5, (perimeter / needed) * 0.98);

    largest = Math.max(14, largest * scale);
    smallest = Math.max(12, Math.min(smallest * scale, largest));
    sizes = diameters(points, maxPoints, smallest, largest);
  }

  // The middle flag keeps clear of the ring (spokes need the room).
  const inner = Math.min(a, b) - (sizes.length ? Math.max(...sizes) / 2 : 0);

  center = clamp(Math.min(center, inner * 0.62), 40, 150);

  const perimeter = lengths[SAMPLES];
  const spare =
    sizes.length > 0
      ? Math.max(
          0,
          (perimeter - sizes.reduce((sum, d) => sum + d + GAP, 0)) /
            sizes.length,
        )
      : 0;

  const slots: RingSlot[] = [];
  // The first flag starts just after 12 o'clock, so the seam between the
  // least and the most points sits at the top, like a clock's.
  let s = sizes.length > 1 ? (sizes[0] + GAP + spare) / 2 : 0;

  sizes.forEach((d, index) => {
    if (index > 0) {
      s += (sizes[index - 1] + d) / 2 + GAP + spare;
    }
    const t = paramAt(lengths, s);
    const x = cx + a * Math.cos(t);
    const y = cy + b * Math.sin(t);
    // The ellipse's normal: (cos t / a, sin t / b).
    const normal = Math.atan2(Math.sin(t) / b, Math.cos(t) / a);

    slots.push({ x, y, d, normal });
  });

  return {
    cx,
    cy,
    center,
    a,
    b,
    slots,
    travel: clamp(smallest * 1.05, 16, 30),
    crowded: sizes.length > 0 && perimeter / sizes.length < CROWDED_ARC,
    pitch: sizes.length > 0 ? perimeter / sizes.length : perimeter,
  };
}
