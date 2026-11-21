import { describe, expect, it } from 'vitest';

import { FlagMosaic, mosaicTiles, planFlagMosaic } from './flagMosaic';

/** The shape every flag gets, in a `width` × `height` box. */
const flagAspect = (mosaic: FlagMosaic, width: number, height: number) => {
  const [tile] = mosaicTiles(mosaic);

  return (tile.width * width) / (tile.height * height);
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('planFlagMosaic', () => {
  it('places every flag, none left over and no empty cells', () => {
    for (let count = 1; count <= 40; count += 1) {
      for (const [width, height] of [
        [3, 2],
        [2, 1],
        [360, 118],
        [1, 1],
      ]) {
        expect(sum(planFlagMosaic(count, width, height).lines)).toBe(count);
      }
    }
  });

  it('keeps 3:2 flags whole in a 3:2 box when the count allows', () => {
    expect(planFlagMosaic(9, 3, 2)).toEqual({
      direction: 'rows',
      lines: [3, 3, 3],
    });
    expect(planFlagMosaic(4, 3, 2).lines).toEqual([2, 2]);
  });

  it('gives ten qualifiers landscape flags, unlike a 5 × 2 grid', () => {
    for (const [width, height] of [
      [3, 2],
      [2, 1],
      [360, 118],
    ]) {
      const mosaic = planFlagMosaic(10, width, height);
      const aspect = flagAspect(mosaic, width, height);

      expect(aspect).toBeGreaterThan(1.2);
      expect(aspect).toBeLessThan(2);
    }
  });

  it('never puts more than twice the flags in one line as in another', () => {
    for (let count = 2; count <= 30; count += 1) {
      const { lines } = planFlagMosaic(count, 3, 2);

      expect(Math.max(...lines)).toBeLessThanOrEqual(2 * Math.min(...lines));
    }
  });

  it('lists the lines with bigger flags first', () => {
    const { lines } = planFlagMosaic(8, 3, 2);

    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });

  it('treats an unmeasured box as 3:2', () => {
    expect(planFlagMosaic(9, 0, 0)).toEqual(planFlagMosaic(9, 3, 2));
  });
});

describe('mosaicTiles', () => {
  it('covers the box exactly, with same-shaped flags', () => {
    for (const mosaic of [
      planFlagMosaic(10, 3, 2),
      planFlagMosaic(7, 360, 118),
      { direction: 'columns', lines: [3, 3, 4] } as FlagMosaic,
    ]) {
      const tiles = mosaicTiles(mosaic);
      const aspects = tiles.map((tile) => tile.width / tile.height);

      expect(sum(tiles.map((tile) => tile.width * tile.height))).toBeCloseTo(
        1,
        9,
      );
      tiles.forEach((tile) => {
        expect(tile.x + tile.width).toBeLessThanOrEqual(1 + 1e-9);
        expect(tile.y + tile.height).toBeLessThanOrEqual(1 + 1e-9);
      });
      aspects.forEach((aspect) => expect(aspect).toBeCloseTo(aspects[0], 9));
    }
  });

  it('fills rows left to right, then the next row down', () => {
    const tiles = mosaicTiles({ direction: 'rows', lines: [2, 4] });

    expect(tiles.map(({ x, y }) => [x, +y.toFixed(3)])).toEqual([
      [0, 0],
      [0.5, 0],
      [0, 0.667],
      [0.25, 0.667],
      [0.5, 0.667],
      [0.75, 0.667],
    ]);
  });
});
