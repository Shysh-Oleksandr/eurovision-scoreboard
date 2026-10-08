import { describe, expect, it } from 'vitest';

import {
  boundingBox,
  HANDLES,
  Rect,
  resizeRect,
  rotatePoint,
  rotateRect,
  snapRect,
} from './geometry';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const sameRect = (a: Rect, b: Rect) =>
  close(a.x, b.x) && close(a.y, b.y) && close(a.w, b.w) && close(a.h, b.h);

/** Screen position of the NW corner of a (possibly rotated) rect. */
const nwCorner = (r: Rect) => {
  const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const p = rotatePoint({ x: -r.w / 2, y: -r.h / 2 }, r.rotation);

  return { x: c.x + p.x, y: c.y + p.y };
};

describe('graphics PoC geometry', () => {
  describe.each([0, 30, 125, 270])('rotation %d°', (rotation) => {
    const start: Rect = { x: 100, y: 80, w: 300, h: 160, rotation };

    it.each(HANDLES)('resize via %s is reversible', (handle) => {
      const d = { x: 37, y: 23 };
      const grown = resizeRect(start, handle, d, { minSize: 1 });
      const back = resizeRect(
        grown,
        handle,
        { x: -d.x, y: -d.y },
        { minSize: 1 },
      );

      expect(sameRect(back, start)).toBe(true);
    });

    it('keeps the opposite corner fixed when resizing from se', () => {
      const grown = resizeRect(start, 'se', { x: 50, y: 20 }, { minSize: 1 });
      const a = nwCorner(start);
      const b = nwCorner(grown);

      expect(close(a.x, b.x) && close(a.y, b.y)).toBe(true);
    });
  });

  it('resize with keepAspect preserves the ratio on corner handles', () => {
    const start: Rect = { x: 0, y: 0, w: 200, h: 100, rotation: 0 };
    const grown = resizeRect(
      start,
      'se',
      { x: 100, y: 10 },
      { keepAspect: true },
    );

    expect(close(grown.w / grown.h, 2)).toBe(true);
  });

  it('resize never goes below minSize', () => {
    const start: Rect = { x: 0, y: 0, w: 20, h: 20, rotation: 0 };
    const shrunk = resizeRect(
      start,
      'se',
      { x: -500, y: -500 },
      { minSize: 8 },
    );

    expect(shrunk.w).toBe(8);
    expect(shrunk.h).toBe(8);
  });

  it('rotates by the pointer angle around the pivot and normalises', () => {
    const r: Rect = { x: 0, y: 0, w: 100, h: 50, rotation: 10 };
    const pivot = { x: 50, y: 25 };
    const rot = rotateRect(r, pivot, { x: 100, y: 25 }, { x: 50, y: 75 });
    const back = rotateRect(rot, pivot, { x: 50, y: 75 }, { x: 100, y: 25 });

    expect(close(rot.rotation, 100)).toBe(true);
    expect(close(back.rotation, 10)).toBe(true);
    expect(
      rotateRect(r, pivot, { x: 100, y: 25 }, { x: 50, y: -25 }).rotation,
    ).toBeCloseTo(280);
  });

  it('snaps to 15° steps when asked', () => {
    const r: Rect = { x: 0, y: 0, w: 100, h: 50, rotation: 0 };
    const pivot = { x: 50, y: 25 };
    const rot = rotateRect(r, pivot, { x: 100, y: 25 }, { x: 98, y: 44 }, 15);

    expect(rot.rotation % 15).toBe(0);
  });

  it('snaps edges and centers to the canvas within the threshold', () => {
    const snapped = snapRect(
      { x: 553, y: 10, w: 100, h: 20, rotation: 0 },
      { width: 1200, height: 630 },
      [],
      6,
    );

    expect(snapped.rect.x).toBe(550); // center → 600
    expect(snapped.guides).toEqual([{ axis: 'x', at: 600 }]);
  });

  it('snaps to sibling edges and ignores rotated rects', () => {
    const others: Rect[] = [
      { x: 300, y: 300, w: 100, h: 100, rotation: 0 },
      { x: 700, y: 300, w: 100, h: 100, rotation: 20 },
    ];
    const snapped = snapRect(
      { x: 404, y: 304, w: 50, h: 50, rotation: 0 },
      { width: 1200, height: 630 },
      others,
      6,
    );

    expect(snapped.rect.x).toBe(400);
    expect(snapped.rect.y).toBe(300);
    expect(
      snapRect(
        { x: 804, y: 100, w: 50, h: 50, rotation: 0 },
        { width: 1200, height: 630 },
        [others[1]],
        6,
      ).guides,
    ).toEqual([]);
  });

  it('does not snap a rotated element', () => {
    const r: Rect = { x: 553, y: 10, w: 100, h: 20, rotation: 5 };

    expect(snapRect(r, { width: 1200, height: 630 }, [], 6).rect).toEqual(r);
  });

  it('computes the bounding box of a rotated rect', () => {
    const box = boundingBox({ x: 0, y: 0, w: 100, h: 100, rotation: 45 });

    expect(box.w).toBeCloseTo(Math.SQRT2 * 100);
    expect(box.x).toBeCloseTo(50 - (Math.SQRT2 * 100) / 2);
  });
});
