import { describe, expect, it } from 'vitest';

import {
  drawNewSongOdds,
  ODDS_HISTORY,
  pickFavourites,
  SeriesOddsHistory,
} from './newSongs';

const ESC = ODDS_HISTORY.esc;

const HISTORY: SeriesOddsHistory = {
  SE: [
    [90, 80],
    [70, 75],
    [95, 60],
  ],
  SM: [
    [5, 5],
    [8, 3],
    [2, 9],
  ],
  // One edition only: draws from everyone's.
  AD: [[40, 40]],
};

describe('drawNewSongOdds', () => {
  it('gives each country one of its own past editions, nudged a little', () => {
    const odds = drawNewSongOdds(['SE', 'SM'], HISTORY, 'seed');

    expect(odds.SE.juryOdds).toBeGreaterThanOrEqual(70 - 6);
    expect(odds.SE.juryOdds).toBeLessThanOrEqual(95 + 6);
    expect(odds.SM.juryOdds).toBeLessThanOrEqual(8 + 6);
    expect(odds.SM.televoteOdds).toBeGreaterThanOrEqual(1);
  });

  it('is the same for the same seed and changes with another', () => {
    const codes = Object.keys(ESC);
    const a = drawNewSongOdds(codes, ESC, 'one');

    expect(drawNewSongOdds(codes, ESC, 'one')).toEqual(a);
    expect(drawNewSongOdds(codes, ESC, 'two')).not.toEqual(a);
  });

  it("doesn't change a country when others join or leave", () => {
    const alone = drawNewSongOdds(['SE'], HISTORY, 'seed');
    const together = drawNewSongOdds(['SE', 'SM', 'AD'], HISTORY, 'seed');

    expect(together.SE).toEqual(alone.SE);
  });

  it('draws from everyone for countries without enough history', () => {
    const odds = drawNewSongOdds(['AD', 'custom-1'], HISTORY, 'seed');
    const everyone = Object.values(HISTORY).flat();
    const lowest = Math.min(...everyone.map(([jury]) => jury)) - 6;
    const highest = Math.max(...everyone.map(([jury]) => jury)) + 6;

    [odds.AD, odds['custom-1']].forEach(({ juryOdds }) => {
      expect(juryOdds).toBeGreaterThanOrEqual(Math.max(1, lowest));
      expect(juryOdds).toBeLessThanOrEqual(Math.min(99, highest));
    });
  });

  it('keeps every value between 1 and 99 in half steps', () => {
    const odds = drawNewSongOdds(Object.keys(ESC), ESC, 'bounds');

    Object.values(odds).forEach(({ juryOdds, televoteOdds }) => {
      [juryOdds!, televoteOdds!].forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(99);
        expect(Number.isInteger(value * 2)).toBe(true);
      });
    });
  });

  it('changes the favourite from year to year', () => {
    // 2026's line-up, which has Bulgaria on 99 and 99.
    const codes = ['BG', 'IL', 'AU', 'FI', 'IT', 'SE', 'UA', 'NO', 'FR', 'MT'];
    const winners = new Set(
      Array.from(
        { length: 20 },
        (_, i) =>
          pickFavourites(drawNewSongOdds(codes, ESC, `year-${i}`), codes, 1)[0],
      ),
    );

    expect(winners.size).toBeGreaterThan(3);
  });
});

describe('pickFavourites', () => {
  it('orders by combined odds', () => {
    expect(
      pickFavourites(
        {
          A: { juryOdds: 50, televoteOdds: 50 },
          B: { juryOdds: 90, televoteOdds: 40 },
          C: { juryOdds: 10, televoteOdds: 10 },
          D: { juryOdds: 60, televoteOdds: 70 },
        },
        ['A', 'B', 'C', 'D'],
        2,
      ),
    ).toEqual(['B', 'D']);
  });
});
