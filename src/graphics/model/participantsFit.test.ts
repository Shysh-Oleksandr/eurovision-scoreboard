import { describe, expect, it } from 'vitest';

import {
  CHIP_METRICS,
  fitChips,
  MAX_CHIP_HEIGHT,
  MIN_CHIP_HEIGHT,
  packLines,
} from './participantsFit';
import { rowGeometry } from './rowGeometry';

const linesHeight = (lines: number, rh: number) =>
  (lines + (lines - 1) * CHIP_METRICS.gapY) * rh;

describe('packLines', () => {
  it('fills each line up to the width', () => {
    expect(packLines([3, 3, 3, 3], 1, 7)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(packLines([3, 3, 3, 3], 1, 6.9)).toEqual([[0], [1], [2], [3]]);
  });
});

describe('fitChips', () => {
  // 37 countries, chips 5–8 row heights wide (a portrait card's line-up).
  const widths = Array.from({ length: 37 }, (_, i) => 5 + (i % 4));

  it('picks the largest rows whose lines fit the box', () => {
    const fit = fitChips({ widths, overhang: 0.3, width: 968, height: 1000 });
    const gap = CHIP_METRICS.gapX + 0.3;

    expect(fit.lines.flat()).toEqual(widths.map((_, i) => i));
    expect(linesHeight(fit.lines.length, fit.rowHeight)).toBeLessThanOrEqual(
      1000.5,
    );
    fit.lines.forEach((line) => {
      const used =
        line.reduce((sum, i) => sum + widths[i], 0) + (line.length - 1) * gap;

      expect((used + 0.3) * fit.rowHeight).toBeLessThanOrEqual(968.5);
    });
    // A pixel more no longer fits.
    const bigger = fitChips({
      widths,
      overhang: 0.3,
      width: 968,
      height: linesHeight(fit.lines.length, fit.rowHeight + 1) - 2,
    });

    expect(bigger.rowHeight).toBeLessThanOrEqual(fit.rowHeight);
  });

  it('evens the lines out instead of leaving one chip on the last', () => {
    const fit = fitChips({
      widths: [4, 4, 4, 4, 4, 4, 4],
      overhang: 0,
      width: 600,
      height: 160,
    });
    const counts = fit.lines.map((l) => l.length);

    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('caps a short list and floors an impossible one', () => {
    expect(
      fitChips({ widths: [4, 4], overhang: 0, width: 5000, height: 5000 })
        .rowHeight,
    ).toBe(MAX_CHIP_HEIGHT);
    expect(
      fitChips({ widths, overhang: 0, width: 100, height: 100 }).rowHeight,
    ).toBe(MIN_CHIP_HEIGHT);
    expect(
      fitChips({ widths: [], overhang: 0, width: 100, height: 100 }).lines,
    ).toEqual([]);
  });
});

describe('rowGeometry', () => {
  it('puts a heart taller than the row over its left end, whatever its shape', () => {
    [true, false].forEach((rounded) => {
      const g = rowGeometry('heart', { rounded, flagShape: '' });

      expect(g.heart?.placement).toBe('overlap');
      expect(g.heart!.size).toBeGreaterThan(1.3);
      expect(g.heart!.left).toBeLessThan(0);
      expect(g.surfaceLeft).toBeLessThan(g.heart!.left + g.heart!.size / 2);
      expect(g.lead).toBeGreaterThan(g.heart!.left + g.heart!.size * 0.9);
    });
    expect(
      rowGeometry('theme', { rounded: false, flagShape: 'none' }).heart,
    ).toBeNull();
  });
});
