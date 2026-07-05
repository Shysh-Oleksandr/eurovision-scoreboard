/*
 * Shared, scale-invariant scoreboard-shape metrics. Used by BOTH the historical
 * analyzer and the simulator harness so real data and sim output are measured by
 * the exact same code path (the only way the gap comparison is meaningful).
 */

// Fixed grid (0 = winner, 1 = last place) onto which each scoreboard's
// max-normalized decay curve is resampled so boards of different sizes can be
// averaged together.
export const CURVE_GRID = Array.from({ length: 21 }, (_, i) => i / 20);

export type Metrics = {
  n: number;
  sum: number;
  max: number;
  winnerShare: number; // p0 / sum
  winnerMargin: number; // (p0 - p1) / sum   -- "how safe is the win"
  runnerUpGap: number; // (p1 - p2) / sum
  top3Share: number;
  top10Share: number;
  topHalfShare: number; // share held by the better half of the field
  zeroCount: number;
  zeroFrac: number;
  sub5Count: number; // entries scoring < 5% of the winner (near-nul)
  sub5Frac: number;
  maxToMedian: number; // p0 / median
  gini: number;
  effectiveN: number; // inverse-Simpson: sum^2 / sum(p^2)
  effectiveFrac: number; // effectiveN / n
  curve: number[]; // max-normalized value at each CURVE_GRID position
};

export const SCALAR_KEYS: (keyof Metrics)[] = [
  'n',
  'winnerShare',
  'winnerMargin',
  'runnerUpGap',
  'top3Share',
  'top10Share',
  'topHalfShare',
  'zeroCount',
  'zeroFrac',
  'sub5Count',
  'sub5Frac',
  'maxToMedian',
  'gini',
  'effectiveN',
  'effectiveFrac',
];

const quantileSortedDesc = (descending: number[], q: number): number => {
  const n = descending.length;

  if (n === 1) return descending[0];
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;

  return descending[lo] * (1 - frac) + descending[hi] * frac;
};

const gini = (values: number[]): number => {
  const asc = [...values].sort((a, b) => a - b);
  const n = asc.length;
  const sum = asc.reduce((a, b) => a + b, 0);

  if (sum === 0) return 0;
  let cumWeighted = 0;

  asc.forEach((v, i) => {
    cumWeighted += (i + 1) * v;
  });

  return (2 * cumWeighted) / (n * sum) - (n + 1) / n;
};

export const computeMetrics = (rawPoints: number[]): Metrics => {
  const p = [...rawPoints].sort((a, b) => b - a);
  const n = p.length;
  const sum = p.reduce((a, b) => a + b, 0);
  const [max] = p;
  const median = quantileSortedDesc(p, 0.5);
  const sumSq = p.reduce((a, b) => a + b * b, 0);
  const effectiveN = sumSq === 0 ? n : (sum * sum) / sumSq;

  const shareOfTop = (k: number) =>
    p.slice(0, Math.min(k, n)).reduce((a, b) => a + b, 0) / sum;

  const curve = CURVE_GRID.map((g) =>
    max === 0 ? 0 : quantileSortedDesc(p, g) / max,
  );

  const zeroCount = p.filter((v) => v === 0).length;
  const sub5Count = p.filter((v) => v < 0.05 * max).length;

  return {
    n,
    sum,
    max,
    winnerShare: max / sum,
    winnerMargin: (p[0] - p[1]) / sum,
    runnerUpGap: (p[1] - p[2]) / sum,
    top3Share: shareOfTop(3),
    top10Share: shareOfTop(10),
    topHalfShare: shareOfTop(Math.ceil(n / 2)),
    zeroCount,
    zeroFrac: zeroCount / n,
    sub5Count,
    sub5Frac: sub5Count / n,
    maxToMedian: median === 0 ? Infinity : max / median,
    gini: gini(p),
    effectiveN,
    effectiveFrac: effectiveN / n,
    curve,
  };
};

export const mean = (xs: number[]): number =>
  xs.reduce((a, b) => a + b, 0) / xs.length;

export const std = (xs: number[]): number => {
  const m = mean(xs);

  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

export type Envelope = {
  channel: string;
  years: string[];
  scalar: Record<
    string,
    { mean: number; std: number; min: number; max: number }
  >;
  curve: { mean: number[]; grid: number[] };
};

export const buildEnvelope = (
  channel: string,
  perYear: { year: string; metrics: Metrics }[],
): Envelope => {
  const scalar: Envelope['scalar'] = {};

  for (const key of SCALAR_KEYS) {
    const vals = perYear
      .map((y) => y.metrics[key] as number)
      .filter((v) => Number.isFinite(v));

    scalar[key] = {
      mean: mean(vals),
      std: std(vals),
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }
  const curveMean = CURVE_GRID.map((_, i) =>
    mean(perYear.map((y) => y.metrics.curve[i])),
  );

  return {
    channel,
    years: perYear.map((y) => y.year),
    scalar,
    curve: { mean: curveMean, grid: CURVE_GRID },
  };
};
