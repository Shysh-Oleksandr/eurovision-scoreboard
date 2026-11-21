/**
 * Next year's "New songs": every country taking part gets new jury and
 * televote odds, so the same favourite doesn't win year after year (the 2026
 * data gives Bulgaria 99 and 99). A country gets the odds of one of its own
 * past editions in the series (`oddsHistory.generated.json`, from the
 * countries data) plus a small nudge: Sweden is still usually strong and San
 * Marino usually not, but the favourites change. A country with fewer than
 * three past editions (custom entries, newcomers, most of the one-edition
 * ESC Asia) gets the odds of a random past entry of any country.
 *
 * Seeded per country (`seed:code`), so the dialog's preview is exactly what
 * is applied, and moving a country in or out doesn't reshuffle the others.
 */
import oddsHistoryJson from './oddsHistory.generated.json';

import type { ContestType } from '@/data/contestTypes';
import { createRng } from '@/state/allocationDraw/rng';
import type { CountryOdds } from '@/state/countriesStore';

/** `[jury, televote]` odds of one edition. */
export type OddsPair = readonly [number, number];

/** Each country's past odds in one series, oldest first. */
export type SeriesOddsHistory = Readonly<Record<string, readonly OddsPair[]>>;

export type OddsHistory = Readonly<Record<ContestType, SeriesOddsHistory>>;

/** Every series' history (`yarn gen:odds-history`). */
export const ODDS_HISTORY = oddsHistoryJson as unknown as OddsHistory;

/** Fewer past editions than this and a country draws from everyone's. */
const MIN_OWN_EDITIONS = 3;
/** Each odd moves by up to this much either way. */
const NUDGE = 6;
const MIN_ODDS = 1;
const MAX_ODDS = 99;

const settle = (value: number) =>
  Math.min(MAX_ODDS, Math.max(MIN_ODDS, Math.round(value * 2) / 2));

export const drawNewSongOdds = (
  codes: readonly string[],
  history: SeriesOddsHistory,
  seed: string,
): CountryOdds => {
  const everyone = Object.values(history).flat();
  const odds: CountryOdds = {};

  codes.forEach((code) => {
    const random = createRng(`${seed}:${code}`);
    const own = history[code] ?? [];
    const pool = own.length >= MIN_OWN_EDITIONS ? own : everyone;
    const [jury, televote] =
      pool.length > 0
        ? pool[Math.floor(random() * pool.length)]
        : [random() * 60 + 10, random() * 60 + 10];
    const nudge = () => (random() * 2 - 1) * NUDGE;

    odds[code] = {
      juryOdds: settle(jury + nudge()),
      televoteOdds: settle(televote + nudge()),
    };
  });

  return odds;
};

/** The countries with the best combined odds, best first (ties A–Z by code). */
export const pickFavourites = (
  odds: CountryOdds,
  codes: readonly string[],
  count = 3,
): string[] => {
  const strength = (code: string) =>
    (odds[code]?.juryOdds ?? 0) + (odds[code]?.televoteOdds ?? 0);

  return [...codes]
    .sort((a, b) => strength(b) - strength(a) || a.localeCompare(b))
    .slice(0, count);
};

/** A fresh seed for a draw of odds. */
export const newOddsSeed = (): string =>
  Math.random().toString(36).slice(2, 10);
