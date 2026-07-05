import { BaseCountry } from '../../models';
import { CountryOdds } from '../countriesStore';

/**
 * Map the 0-100 "points spread" slider to the odds band `[lo, hi]` used when
 * generating rank odds. Spread is intentionally a TWO-layer lever: the band here
 * AND the simulation weight exponent (`calculateDistributionExponent`, which
 * grows 1 -> 4). Because both move with spread and compound, the band stays
 * deliberately narrow — especially at the top, where the exponent does the
 * amplifying. Anchors (linear with a knee at 50):
 *   spread 0   -> [50, 73]  (exponent 1.0  -> ~1.5:1  result gap, near-flat)
 *   spread 50  -> [33, 85]  (exponent 2.5  -> ~11:1   result gap, default)
 *   spread 100 -> [13, 98]  (exponent 4.0  -> ~3200:1 result gap, blowout)
 */
const bandFor = (pointsSpread: number): { lo: number; hi: number } => {
  const s = Math.max(0, Math.min(pointsSpread, 100));

  if (s <= 50) {
    const t = s / 50;

    return { lo: 50 + (33 - 50) * t, hi: 73 + (85 - 73) * t };
  }

  const t = (s - 50) / 50;

  return { lo: 33 + (13 - 33) * t, hi: 85 + (98 - 85) * t };
};

const roundToHalf = (value: number): number => Math.round(value * 2) / 2;

/**
 * Generate an odds value per country from a ranked order (index 0 = best).
 * Odds interpolate linearly from `hi` (top rank) down to `lo` (last rank); the
 * band width is set by `pointsSpread` via `bandFor`.
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

  const { lo, hi } = bandFor(pointsSpread);

  if (n === 1) {
    result[orderedCodes[0]] = roundToHalf(hi);

    return result;
  }

  orderedCodes.forEach((code, rank) => {
    // Normalized position: 1 at the top rank, 0 at the bottom rank.
    const p = (n - 1 - rank) / (n - 1);

    result[code] = roundToHalf(lo + (hi - lo) * p);
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
