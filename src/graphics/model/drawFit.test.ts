import { describe, expect, it } from 'vitest';

import { DrawSemi } from './design';
import {
  DrawFitInput,
  DrawFitSemi,
  drawColumns,
  fitDraw,
  MAX_ROW_HEIGHT,
  MIN_ROW_HEIGHT,
  semiHeightRh,
  votersLines,
} from './drawFit';

const entries = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    code: `C${i}`,
    name: `Country ${i}`,
  }));

const semi = (n: number, firstHalfSize?: number): DrawSemi => ({
  id: 'SF',
  name: 'Semi-Final',
  entries: entries(n),
  firstHalfSize,
  voters: [],
});

const fitSemi = (rows: number, columns = 2): DrawFitSemi => ({
  columns,
  rows,
  headers: true,
  voters: [],
});

const input = (
  semis: DrawFitSemi[],
  width: number,
  height: number,
): DrawFitInput => ({
  semis,
  numbered: false,
  lead: 1.09,
  overhang: 0.3,
  nameEm: 7.3,
  votersLabelChars: 11,
  width,
  height,
});

describe('drawColumns', () => {
  it('splits halves at firstHalfSize', () => {
    const columns = drawColumns(semi(15, 7), 'halves');

    expect(columns.map((c) => c.header)).toEqual(['firstHalf', 'secondHalf']);
    expect(columns.map((c) => c.cells.length)).toEqual([7, 8]);
    expect(columns[1].cells[0].position).toBe(8);
  });

  it('keeps short lists in one column and splits long ones top to bottom', () => {
    expect(drawColumns(semi(6), 'positions')).toHaveLength(1);
    const columns = drawColumns(semi(15), 'positions');

    expect(columns.map((c) => c.cells.length)).toEqual([8, 7]);
    expect(columns.every((c) => c.header === null)).toBe(true);
    // A semi without halves (removed after the draw) is a plain list.
    expect(drawColumns(semi(15), 'halves')[0].header).toBeNull();
  });
});

describe('fitDraw', () => {
  it('fits two semis of 15 and 16 side by side on a wide canvas', () => {
    const semis = [fitSemi(8), fitSemi(8)];
    const fit = fitDraw(input(semis, 1112, 470));

    expect(fit.arrangement).toBe('row');
    expect(fit.rowHeight).toBeGreaterThan(28);
    // The height it needs is within the space.
    expect(semiHeightRh(semis[0], 0) * fit.rowHeight).toBeLessThanOrEqual(
      470.5,
    );
    // One pixel more would not fit.
    const bigger = fit.rowHeight + 1;

    expect(
      semiHeightRh(semis[0], 0) * bigger > 470.5 ||
        fit.columnWidth * 2 + bigger * (0.75 + 0.3) > 1112,
    ).toBe(true);
  });

  it('stacks the semis when that gives bigger rows', () => {
    const fit = fitDraw(input([fitSemi(4), fitSemi(4)], 420, 900));

    expect(fit.arrangement).toBe('column');
  });

  it('caps the row height for a handful of countries', () => {
    const fit = fitDraw(input([fitSemi(2), fitSemi(2)], 3000, 3000));

    expect(fit.rowHeight).toBe(MAX_ROW_HEIGHT);
  });

  it('overflows at the smallest rows when nothing fits', () => {
    const fit = fitDraw(input([fitSemi(40), fitSemi(40)], 300, 100));

    expect(fit.rowHeight).toBe(MIN_ROW_HEIGHT);
  });
});

describe('votersLines', () => {
  it('wraps the voters line when the semi is narrow', () => {
    const names = ['France', 'Germany', 'Italy'];

    expect(votersLines([], 11, 10)).toBe(0);
    expect(votersLines(names, 11, 30)).toBe(1);
    expect(votersLines(names, 11, 6)).toBeGreaterThan(1);
  });
});
