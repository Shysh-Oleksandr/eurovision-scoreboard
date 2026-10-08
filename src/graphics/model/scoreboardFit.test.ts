import { describe, expect, it } from 'vitest';

import {
  fitScoreboard,
  GRID_MARGIN_Y,
  gridHeight,
  rowsHeightIn,
  SIZE_METRICS,
} from './scoreboardFit';

/** Rows area of the results starter at 1200 × 630 (measured in the app). */
const LANDSCAPE = { w: 1056, h: 465 };

describe('fitScoreboard', () => {
  it('fits a 25-entry final into a landscape share image', () => {
    const fit = fitScoreboard(25, LANDSCAPE.w, LANDSCAPE.h);

    expect(fit).toMatchObject({ columns: 3, itemSize: 'xl' });
    expect(gridHeight(25, fit.columns, fit.itemSize)).toBeLessThanOrEqual(
      LANDSCAPE.h,
    );
  });

  it('uses one big centred column for a handful of rows', () => {
    const fit = fitScoreboard(6, LANDSCAPE.w, LANDSCAPE.h);

    expect(fit).toMatchObject({ columns: 1, itemSize: '2xl' });
    expect(fit.width).toBe(SIZE_METRICS['2xl'].maxWidth);
  });

  it('shrinks rows and adds columns as the count grows', () => {
    const sizes = [10, 25, 40, 60, 100].map(
      (n) => fitScoreboard(n, LANDSCAPE.w, LANDSCAPE.h).itemSize,
    );
    const order = ['sm', 'md', 'lg', 'xl', '2xl'];

    sizes.reduce((prev, size) => {
      expect(order.indexOf(size)).toBeLessThanOrEqual(order.indexOf(prev));

      return size;
    });
  });

  it('never makes columns narrower than the row size allows', () => {
    [5, 15, 26, 37, 52, 80].forEach((n) => {
      [300, 600, 1056, 1800].forEach((w) => {
        const { columns, itemSize } = fitScoreboard(n, w, 400);
        const { gap, minWidth } = SIZE_METRICS[itemSize];

        if (columns > 1) {
          expect((w - gap * (columns - 1)) / columns).toBeGreaterThanOrEqual(
            minWidth,
          );
        }
      });
    });
  });

  it('falls back to the smallest rows when nothing fits', () => {
    expect(fitScoreboard(200, 500, 100).itemSize).toBe('sm');
  });

  it('picks the same layout again from the box it rendered', () => {
    // The editor frees a flow scoreboard at its rendered height; the free
    // box must resolve to the same columns and size (no jump on open).
    [6, 15, 25, 37, 60].forEach((n) => {
      const first = fitScoreboard(n, 1056, 465);
      const padding = 16;
      const rendered =
        gridHeight(n, first.columns, first.itemSize) +
        GRID_MARGIN_Y +
        padding * 2;
      const again = fitScoreboard(
        n,
        1056,
        rowsHeightIn(Math.floor(rendered), padding),
      );

      expect(again).toEqual(first);
    });
  });
});
