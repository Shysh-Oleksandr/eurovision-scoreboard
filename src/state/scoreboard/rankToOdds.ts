import { BaseCountry } from '../../models';
import { CountryOdds } from '../countriesStore';

// Odds value range produced by the rank generator. Matches the 0-100 range that
// year-data and the Randomize button already use, and stays well within the
// CountryOddsItem MAX_ODDS (1000) cap. Kept easy to tweak while we validate the feel.
export const RANK_ODDS_MIN = 1;
export const RANK_ODDS_MAX = 100;

/**
 * Map the 0-100 "points spread" slider to the curve exponent (gamma) used to
 * distribute odds across ranks.
 * - spread 50 -> gamma 1 (even spacing between ranks)
 * - spread < 50 -> gamma < 1 (values bunch toward the top = tighter gap)
 * - spread > 50 -> gamma > 1 (values drop off quickly = wider gap)
 */
const calculateRankGamma = (pointsSpread: number): number => {
  const clamped = Math.max(0, Math.min(pointsSpread, 100));

  if (clamped <= 50) {
    // 0 -> 0.4, 50 -> 1
    return 0.4 + (clamped / 50) * 0.6;
  }

  // 50 -> 1, 100 -> 2.5
  return 1 + ((clamped - 50) / 50) * 1.5;
};

const roundToHalf = (value: number): number => Math.round(value * 2) / 2;

/**
 * Generate an odds value per country from a ranked order (index 0 = best).
 * The gap between the top and bottom is shaped by `pointsSpread`.
 */
export const rankOrderToOdds = (
  orderedCodes: string[],
  pointsSpread: number,
): Record<string, number> => {
  const n = orderedCodes.length;
  const result: Record<string, number> = {};

  if (n === 0) {
    return result;
  }

  if (n === 1) {
    result[orderedCodes[0]] = RANK_ODDS_MAX;

    return result;
  }

  const gamma = calculateRankGamma(pointsSpread);
  const range = RANK_ODDS_MAX - RANK_ODDS_MIN;

  orderedCodes.forEach((code, rank) => {
    // Normalized position: 1 at the top rank, 0 at the bottom rank.
    const p = (n - 1 - rank) / (n - 1);

    result[code] = roundToHalf(RANK_ODDS_MIN + range * Math.pow(p, gamma));
  });

  return result;
};

/**
 * Derive a ranked order (best first) from the current odds of the active
 * dimension. Ties are broken alphabetically by name for a stable, predictable
 * order. This is the numeric -> rank bridge when entering rank mode.
 */
export const oddsToRankOrder = (
  countries: BaseCountry[],
  countryOdds: CountryOdds,
  dimension: 'jury' | 'televote',
): string[] => {
  const oddsKey = dimension === 'jury' ? 'juryOdds' : 'televoteOdds';

  return [...countries]
    .sort((a, b) => {
      const aOdds = countryOdds[a.code]?.[oddsKey] ?? 50;
      const bOdds = countryOdds[b.code]?.[oddsKey] ?? 50;

      if (aOdds !== bOdds) {
        return bOdds - aOdds; // higher odds first
      }

      return a.name.localeCompare(b.name);
    })
    .map((c) => c.code);
};
