/**
 * How the last country's fill climbs during the final televote reveal.
 *
 * Values are in mark units: 0 is the last country's score before its
 * televote, 1 is the points it needs to win (the mark). Times are seconds
 * from the start of the fill.
 *
 * The suspense rule: the climb is planned before looking at the result.
 * Its pace, its beats (short holds) and the slow crawl up to the mark are
 * drawn the same way whoever wins, so the motion says nothing about the
 * outcome until the outcome happens:
 * - a winner follows the climb to the mark and crosses it;
 * - a country that falls short follows the same climb and only diverges in
 *   the last fraction of a second, where it settles at its total the way it
 *   settles into any beat;
 * - the verdict waits for a hold longer than any beat, so until then a stop
 *   could still be a pause.
 *
 * Both reveal styles use this planner: the bar (useRevealAnimation) and the
 * ladder (ladder/ladderPacing.ts, pinned by ladderPacing.test.ts). Changing
 * the API or what a mark unit means changes both.
 */

export type RevealKnot = {
  /** Seconds from the start of the fill. */
  t: number;
  /** Mark units (1 = the points needed to win). */
  v: number;
  /** Slope in mark units per second. */
  m: number;
};

/** A monotone, smooth (C1) piecewise cubic Hermite curve through its knots. */
export type RevealPath = RevealKnot[];

type Range = readonly [number, number];

/** Seconds at speed 1; every duration is divided by the speed setting. */
export const REVEAL_PATH_TIMING = {
  /** Linear mode: one constant pace, eased in, reaching the mark here. */
  linearMarkTime: 9,
  linearEaseIn: 1,
  linearSettle: 0.7,
  linearVerdictHold: 1,

  /** Where the slow crawl up to the mark starts (mark units). */
  crawlStart: [0.8, 0.9] as Range,
  crawlDuration: [1.8, 2.8] as Range,
  /** Chance of one beat inside the crawl, and where (share of the crawl). */
  crawlBeatChance: 0.35,
  crawlBeatAt: [0.4, 0.75] as Range,

  /** Moves before the crawl (weighted pick). */
  climbMoves: [2, 3, 3, 4, 4, 5] as const,
  /** The first move is this much bigger than the others on average. */
  firstMoveWeight: 1.3,
  moveWeight: [0.7, 1.3] as Range,
  /** Moving time before the crawl at the base pace. */
  climbMovingTime: [4.6, 6.2] as Range,
  /** Each move's pace as a share of the base pace. */
  movePace: [0.72, 1.35] as Range,
  moveDuration: [0.5, 2.6] as Range,
  /** Chance of a beat after each move (at least one per climb). */
  beatChance: 0.45,
  beat: [0.3, 0.75] as Range,

  /** A losing country decelerates to its total over about this long. */
  settle: [0.55, 0.85] as Range,
  /** Rest-to-rest settle when the climb is still at that point. */
  settleFromRestMax: 1.6,
  /** Longer than any beat, so a stop is only final once this has passed. */
  verdictHold: 0.95,
} as const;

const T = REVEAL_PATH_TIMING;

type Draw = () => number;

const between = (random: Draw, [min, max]: Range) =>
  min + (max - min) * random();

const clamp = (value: number, [min, max]: Range) =>
  Math.min(max, Math.max(min, value));

const pick = <Item>(random: Draw, items: readonly Item[]): Item =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;

const normaliseSpeed = (speed: number) =>
  Number.isFinite(speed) && speed > 0 ? clamp(speed, [0.25, 4]) : 1;

type Point = { t: number; v: number; m?: number };

/**
 * Fills in the slopes the points don't set, with monotone (PCHIP,
 * Fritsch–Butland) weights: a point between two moves keeps the motion
 * flowing, a point next to a hold gets 0, so moves ease into and out of
 * beats.
 */
const withSlopes = (points: Point[]): RevealPath =>
  points.map((point, i) => {
    if (point.m !== undefined) return { t: point.t, v: point.v, m: point.m };

    const prev = points[i - 1];
    const next = points[i + 1];

    if (!prev || !next) return { t: point.t, v: point.v, m: 0 };

    const h0 = point.t - prev.t;
    const h1 = next.t - point.t;
    const d0 = (point.v - prev.v) / h0;
    const d1 = (next.v - point.v) / h1;

    if (!(d0 > 0) || !(d1 > 0)) return { t: point.t, v: point.v, m: 0 };

    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;

    return { t: point.t, v: point.v, m: (w1 + w2) / (w1 / d0 + w2 / d1) };
  });

/**
 * The climb from 0 to the mark, planned without the result. Linear mode is
 * one constant pace; otherwise a few moves of varying pace and size, a beat
 * or two, then a slow crawl up to the mark that a winner crosses at speed.
 */
export const buildRevealClimb = ({
  speed,
  linear,
  random = Math.random,
}: {
  speed: number;
  linear: boolean;
  random?: Draw;
}): RevealPath => {
  const points: Point[] = [{ t: 0, v: 0, m: 0 }];
  let time = 0;

  const moveTo = (v: number, duration: number, m?: number) => {
    time += duration;
    points.push({ t: time, v, m });
  };
  const hold = (duration: number) => {
    if (duration <= 0) return;
    time += duration;
    points.push({ t: time, v: points[points.length - 1]!.v });
  };
  // Crosses the mark at the pace of the last segment.
  const finishAtMark = (duration: number) => {
    const from = points[points.length - 1]!.v;

    moveTo(1, duration, (1 - from) / duration);
  };

  if (linear) {
    const total = T.linearMarkTime;
    const easeIn = T.linearEaseIn;
    const pace = 1 / (total - easeIn / 2);

    moveTo((pace * easeIn) / 2, easeIn, pace);
    moveTo(1, total - easeIn, pace);
  } else {
    const crawlStart = between(random, T.crawlStart);
    const moveCount = pick(random, T.climbMoves);
    const weights = Array.from(
      { length: moveCount },
      (_, i) =>
        between(random, T.moveWeight) * (i === 0 ? T.firstMoveWeight : 1),
    );
    const weightTotal = weights.reduce((sum, w) => sum + w, 0);
    const basePace = crawlStart / between(random, T.climbMovingTime);
    const durations = weights.map((w) =>
      clamp(
        ((w / weightTotal) * crawlStart) /
          (basePace * between(random, T.movePace)),
        T.moveDuration,
      ),
    );
    // A beat may follow each move, the last one being the step into the crawl.
    const beats: number[] = weights.map(() =>
      random() < T.beatChance ? between(random, T.beat) : 0,
    );

    if (!beats.some((b) => b > 0)) {
      beats[Math.floor(random() * beats.length) % beats.length] = between(
        random,
        T.beat,
      );
    }

    const crawlTime = between(random, T.crawlDuration);
    const crawlBeat =
      random() < T.crawlBeatChance
        ? {
            at: between(random, T.crawlBeatAt),
            duration: between(random, T.beat),
          }
        : null;

    let reached = 0;

    weights.forEach((w, i) => {
      reached =
        i === moveCount - 1
          ? crawlStart
          : reached + (w / weightTotal) * crawlStart;
      moveTo(reached, durations[i]!);
      hold(beats[i]!);
    });

    if (crawlBeat) {
      moveTo(
        crawlStart + (1 - crawlStart) * crawlBeat.at,
        crawlTime * crawlBeat.at,
      );
      hold(crawlBeat.duration);
      finishAtMark(crawlTime * (1 - crawlBeat.at));
    } else {
      finishAtMark(crawlTime);
    }
  }

  return withSlopes(points).map((knot) => ({
    t: knot.t / speed,
    v: knot.v,
    m: knot.m * speed,
  }));
};

export const revealPathDuration = (path: RevealPath) =>
  path[path.length - 1]?.t ?? 0;

/** The path's value and slope at `t` (held flat before and after it). */
export const evaluateRevealPath = (
  path: RevealPath,
  t: number,
): { value: number; slope: number } => {
  const [first] = path;
  const last = path[path.length - 1];

  if (!first || !last) return { value: 0, slope: 0 };
  if (t <= first.t) return { value: first.v, slope: 0 };
  if (t >= last.t) return { value: last.v, slope: 0 };

  let i = 0;

  while (i < path.length - 2 && path[i + 1]!.t <= t) i += 1;

  const a = path[i]!;
  const b = path[i + 1]!;
  const h = b.t - a.t;
  const s = (t - a.t) / h;
  const s2 = s * s;
  const s3 = s2 * s;

  const value =
    (2 * s3 - 3 * s2 + 1) * a.v +
    (s3 - 2 * s2 + s) * h * a.m +
    (-2 * s3 + 3 * s2) * b.v +
    (s3 - s2) * h * b.m;
  const slope =
    ((6 * s2 - 6 * s) * a.v +
      (3 * s2 - 4 * s + 1) * h * a.m +
      (-6 * s2 + 6 * s) * b.v +
      (3 * s2 - 2 * s) * h * b.m) /
    h;

  return {
    value: Math.min(Math.max(value, Math.min(a.v, b.v)), Math.max(a.v, b.v)),
    slope: Math.max(0, slope),
  };
};

/** The first time the (monotone) path reaches `target`. */
const timeToReach = (path: RevealPath, target: number) => {
  let lo = 0;
  let hi = revealPathDuration(path);

  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;

    if (evaluateRevealPath(path, mid).value >= target) hi = mid;
    else lo = mid;
  }

  return hi;
};

/**
 * The climb of a country that ends below the mark at `target`: exactly the
 * climb until shortly before it would pass `target`, then a constant
 * deceleration that brings it to rest there (from rest when the climb is
 * still at that point).
 */
export const settleRevealClimb = (
  climb: RevealPath,
  target: number,
  { speed, settle }: { speed: number; settle: number },
): RevealPath => {
  if (target >= 1) return climb;
  if (target <= 0) return [{ t: 0, v: 0, m: 0 }];

  const reach = timeToReach(climb, target);
  const step = 1 / 480 / speed;
  const upTo = (at: number, ...tail: RevealKnot[]) => [
    ...climb.filter((knot) => knot.t < at - 1e-9),
    ...tail,
  ];
  let at = reach;

  for (;;) {
    at = Math.max(0, at - step);

    const { value, slope } = evaluateRevealPath(climb, at);
    const gap = target - value;
    const fromRest = Math.min(
      settle + (gap * 4) / speed,
      T.settleFromRestMax / speed,
    );

    if (at <= 0 || slope < 1e-6) {
      return upTo(
        at,
        { t: at, v: value, m: 0 },
        { t: at + fromRest, v: target, m: 0 },
      );
    }

    // Decelerating evenly from `slope` covers `gap` in 2 * gap / slope. Just
    // after a beat the climb is barely moving and that can overshoot the
    // settle by far, so cap it (a softer, still monotone, landing).
    if ((2 * gap) / slope >= settle) {
      return upTo(
        at,
        { t: at, v: value, m: slope },
        { t: at + Math.min((2 * gap) / slope, fromRest), v: target, m: 0 },
      );
    }
  }
};

export type RevealPlan = {
  /** The fill's path: to the mark for a winner, to its total otherwise. */
  path: RevealPath;
  isWinner: boolean;
  /** Losing only: the still hold after the fill stops, before the verdict. */
  verdictHold: number;
};

/**
 * Plans the fill for the last country's televote. The climb is drawn first,
 * independently of `receivedPoints`, which only decides where it stops.
 */
export const planRevealPath = ({
  pointsNeeded,
  receivedPoints,
  speed,
  linear,
  random = Math.random,
}: {
  pointsNeeded: number;
  receivedPoints: number;
  speed: number;
  linear: boolean;
  random?: Draw;
}): RevealPlan => {
  const safeSpeed = normaliseSpeed(speed);
  const climb = buildRevealClimb({ speed: safeSpeed, linear, random });
  const needed = Math.max(1, pointsNeeded);
  const isWinner = receivedPoints >= needed;

  if (isWinner) return { path: climb, isWinner, verdictHold: 0 };

  const settle =
    (linear ? T.linearSettle : between(random, T.settle)) / safeSpeed;

  return {
    path: settleRevealClimb(climb, Math.max(0, receivedPoints) / needed, {
      speed: safeSpeed,
      settle,
    }),
    isWinner,
    verdictHold: (linear ? T.linearVerdictHold : T.verdictHold) / safeSpeed,
  };
};
