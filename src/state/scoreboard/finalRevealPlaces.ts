import { Country } from '../../models';

import { createCountriesComparator } from './helpers';

type RankedCountry = Pick<
  Country,
  'code' | 'name' | 'points' | 'televotePoints'
>;

/**
 * The places of the final reveal (GLOSSARY: Place, Points to win), worked out
 * once from the standings at the moment the reveal starts.
 *
 * While the last country's televote counts up, its running total `n` stands
 * for "`n − startPoints` televote points so far", so every comparison uses the
 * scoreboard's own tiebreak (points → televote → running order → name). A
 * tie on points is therefore won or lost exactly as the board would rank it.
 */
export interface FinalRevealPlaces {
  /** Countries in the stage: the number of places. */
  totalPlaces: number;
  leaderCode: string;
  leaderPoints: number;
  lastCode: string;
  /** The last country's points before its televote. */
  startPoints: number;
  /** The last country's place before its televote. */
  startPlace: number;
  /**
   * Running totals at which the last country passes someone, ascending: from
   * `points` on it stands on `place`. Several countries passed at the same
   * total collapse into one entry (the furthest place).
   */
  passes: { points: number; place: number }[];
  /** The smallest running total that puts the last country first. */
  winAt: number;
}

/** The last country as it would stand with a running total of `n`. */
const lastAt = (last: RankedCountry, n: number): RankedCountry => ({
  ...last,
  points: n,
  televotePoints: last.televotePoints + (n - last.points),
});

/**
 * The smallest running total (never below the start) at which the last
 * country ranks above `other`.
 */
const passThreshold = (
  last: RankedCountry,
  other: RankedCountry,
  compare: (a: RankedCountry, b: RankedCountry) => number,
): number => {
  const atTie = Math.max(last.points, other.points);

  // Level on points (or already ahead at the start): the tiebreak decides.
  if (compare(lastAt(last, atTie), other) < 0) return atTie;

  return other.points + 1;
};

/**
 * Builds the places for a final reveal. `countries` is the whole stage;
 * `lastCode` the one country still waiting for its televote. Returns `null`
 * when the last country is missing or alone.
 */
export const getFinalRevealPlaces = (
  countries: readonly RankedCountry[],
  lastCode: string,
  runningOrder?: string[],
): FinalRevealPlaces | null => {
  const last = countries.find((c) => c.code === lastCode);
  const others = countries.filter((c) => c.code !== lastCode);

  if (!last || others.length === 0) return null;

  const compare = createCountriesComparator(runningOrder) as (
    a: RankedCountry,
    b: RankedCountry,
  ) => number;
  const [leader] = others.slice().sort(compare);
  const thresholds = others
    .map((other) => passThreshold(last, other, compare))
    .sort((a, b) => a - b);

  const placeAt = (n: number) =>
    1 + thresholds.filter((threshold) => threshold > n).length;

  const startPlace = placeAt(last.points);
  const passes: FinalRevealPlaces['passes'] = [];

  thresholds.forEach((threshold) => {
    if (threshold <= last.points) return;

    const place = placeAt(threshold);
    const previous = passes[passes.length - 1];

    if (previous && previous.points === threshold) {
      previous.place = place;
    } else {
      passes.push({ points: threshold, place });
    }
  });

  return {
    totalPlaces: countries.length,
    leaderCode: leader.code,
    leaderPoints: leader.points,
    lastCode,
    startPoints: last.points,
    startPlace,
    passes,
    winAt: thresholds[thresholds.length - 1] ?? last.points,
  };
};

/** The last country's place for a running total of `n`. */
export const placeAtPoints = (places: FinalRevealPlaces, n: number) => {
  let place = places.startPlace;

  for (const pass of places.passes) {
    if (n < pass.points) break;
    ({ place } = pass);
  }

  return place;
};
