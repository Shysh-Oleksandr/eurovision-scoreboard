import { describe, expect, it } from 'vitest';

import {
  convexHull,
  type RoundedBox,
  slabChains,
  slabLineColor,
} from './painters';

const square = (x: number, y: number, w = 100, h = 20): RoundedBox => ({
  x,
  y,
  w,
  h,
  radii: [0, 0, 0, 0],
});

describe('convexHull', () => {
  it('keeps the outer points only', () => {
    const hull = convexHull([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [5, 5],
      [5, 0],
    ]);

    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual([5, 5]);
  });
});

describe('slabChains', () => {
  it("is a square box's right edge and bottom edge", () => {
    const { right, bottom } = slabChains(square(10, 20));

    expect(right).toEqual([
      [110, 20],
      [110, 40],
    ]);
    expect(bottom).toEqual([
      [110, 40],
      [10, 40],
    ]);
  });

  it('follows rounded corners, from the top-right middle to the bottom-left middle', () => {
    const pill: RoundedBox = { ...square(0, 0), radii: [10, 10, 10, 10] };
    const { right, bottom } = slabChains(pill);
    const [first] = right;
    const last = bottom[bottom.length - 1];

    // 45° on the top-right arc, 135° on the bottom-left one.
    expect(first[0]).toBeCloseTo(90 + 10 * Math.SQRT1_2);
    expect(first[1]).toBeCloseTo(10 - 10 * Math.SQRT1_2);
    expect(last[0]).toBeCloseTo(10 - 10 * Math.SQRT1_2);
    expect(last[1]).toBeCloseTo(10 + 10 * Math.SQRT1_2);
  });

  it('spans the sides of a slab lifted up and to the left', () => {
    // The face 5 px up and left of its resting box: the bottom side runs
    // between the two bottom edges, the right side between the right edges.
    const back = slabChains(square(10, 20));
    const front = slabChains(square(5, 15));
    const right = convexHull([...back.right, ...front.right]);

    expect(right).toEqual(
      expect.arrayContaining([
        [105, 15],
        [105, 35],
        [110, 40],
        [110, 20],
      ]),
    );
    expect(right).toHaveLength(4);
  });
});

describe('slabLineColor', () => {
  it('turns a dark side lighter and a light one darker', () => {
    const lightness = (color: string) =>
      Number(/([\d.]+)%\)$/.exec(color)?.[1]);

    // France's blue: lighter lines; Iceland's red, Lithuania's yellow: darker.
    expect(lightness(slabLineColor('#0641b7'))).toBeGreaterThan(37);
    expect(lightness(slabLineColor('#ee0000'))).toBeLessThan(46);
    expect(lightness(slabLineColor('#fdb913'))).toBeLessThan(53);
    expect(slabLineColor('var(--x)')).toBe('var(--x)');
  });
});
