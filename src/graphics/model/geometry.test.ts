import { describe, expect, it } from 'vitest';

import {
  boundingBox,
  HANDLES,
  Rect,
  resizeRect,
  rotateRect,
  signedAngle,
  snapRect,
  unionBox,
} from './geometry';

const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const sameRect = (a: Rect, b: Rect) =>
  eq(a.x, b.x) && eq(a.y, b.y) && eq(a.w, b.w) && eq(a.h, b.h);

const cornerNW = (r: Rect) => {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const a = (r.rotation * Math.PI) / 180;
  const lx = -r.w / 2;
  const ly = -r.h / 2;

  return {
    x: cx + lx * Math.cos(a) - ly * Math.sin(a),
    y: cy + lx * Math.sin(a) + ly * Math.cos(a),
  };
};

describe('resizeRect', () => {
  [0, 30, 125, 270].forEach((rotation) => {
    const start: Rect = { x: 100, y: 80, w: 300, h: 160, rotation };

    HANDLES.forEach((h) => {
      it(`${h} @${rotation}° there-and-back returns to the start`, () => {
        const d = { x: 37, y: 23 };
        const grown = resizeRect(start, h, d, { minSize: 1 });
        const back = resizeRect(grown, h, { x: -d.x, y: -d.y }, { minSize: 1 });

        expect(sameRect(back, start)).toBe(true);
      });
    });

    it(`se @${rotation}° keeps the NW corner fixed`, () => {
      const grown = resizeRect(start, 'se', { x: 50, y: 20 }, { minSize: 1 });
      const c0 = cornerNW(start);
      const c1 = cornerNW(grown);

      expect(eq(c0.x, c1.x) && eq(c0.y, c1.y)).toBe(true);
    });
  });

  it('keeps the aspect ratio with Shift on a corner', () => {
    const start: Rect = { x: 0, y: 0, w: 200, h: 100, rotation: 0 };
    const r = resizeRect(start, 'se', { x: 100, y: 0 }, { keepAspect: true });

    expect(r.w).toBe(300);
    expect(r.h).toBe(150);
  });

  it('respects the minimum size', () => {
    const start: Rect = { x: 0, y: 0, w: 50, h: 50, rotation: 0 };
    const r = resizeRect(start, 'e', { x: -200, y: 0 }, { minSize: 24 });

    expect(r.w).toBe(24);
    expect(r.x).toBe(0);
  });
});

describe('rotateRect', () => {
  it('rotates by the pointer angle and back', () => {
    const r: Rect = { x: 0, y: 0, w: 100, h: 50, rotation: 10 };
    const pivot = { x: 50, y: 25 };
    const rot = rotateRect(r, pivot, { x: 100, y: 25 }, { x: 50, y: 75 });
    const back = rotateRect(rot, pivot, { x: 50, y: 75 }, { x: 100, y: 25 });

    expect(eq(rot.rotation, 100)).toBe(true);
    expect(eq(back.rotation, 10)).toBe(true);
  });

  it('snaps to 15° steps when asked', () => {
    const r: Rect = { x: 0, y: 0, w: 100, h: 50, rotation: 0 };
    const pivot = { x: 50, y: 25 };
    const rot = rotateRect(r, pivot, { x: 100, y: 25 }, { x: 100, y: 45 }, 15);

    expect(rot.rotation % 15).toBe(0);
  });

  it('signedAngle maps to (-180, 180]', () => {
    expect(signedAngle(350)).toBe(-10);
    expect(signedAngle(180)).toBe(180);
    expect(signedAngle(-370)).toBe(-10);
  });
});

describe('snapRect', () => {
  const canvas = { width: 1200, height: 630 };

  it('snaps the centre to the canvas centre and reports a guide', () => {
    const snapped = snapRect(
      { x: 553, y: 10, w: 100, h: 20, rotation: 0 },
      canvas,
      [],
      6,
    );

    expect(snapped.rect.x).toBe(550);
    expect(snapped.guides).toEqual([{ axis: 'x', at: 600 }]);
    expect(snapped.hint.centred).toBe(true);
    expect(snapped.hint.left).toBe(550);
  });

  it('snaps to a sibling edge', () => {
    const snapped = snapRect(
      { x: 204, y: 300, w: 100, h: 20, rotation: 0 },
      canvas,
      [{ x: 100, y: 0, w: 100, h: 100, rotation: 0 }],
      6,
    );

    expect(snapped.rect.x).toBe(200);
  });

  it('leaves far rects alone and reports distances', () => {
    const snapped = snapRect(
      { x: 250, y: 100, w: 100, h: 20, rotation: 0 },
      canvas,
      [],
      6,
    );

    expect(snapped.rect.x).toBe(250);
    expect(snapped.guides).toEqual([]);
    expect(snapped.hint).toEqual({ left: 250, right: 850, centred: false });
  });

  it('does not snap rotated rects', () => {
    const snapped = snapRect(
      { x: 553, y: 10, w: 100, h: 20, rotation: 12 },
      canvas,
      [],
      6,
    );

    expect(snapped.rect.x).toBe(553);
    expect(snapped.guides).toEqual([]);
  });
});

describe('boxes', () => {
  it('boundingBox of a 90° rect swaps width and height', () => {
    const b = boundingBox({ x: 0, y: 0, w: 100, h: 50, rotation: 90 });

    expect(eq(b.w, 50) && eq(b.h, 100)).toBe(true);
  });

  it('unionBox spans every rect', () => {
    const u = unionBox([
      { x: 0, y: 0, w: 10, h: 10, rotation: 0 },
      { x: 50, y: 20, w: 10, h: 10, rotation: 0 },
    ]);

    expect(u).toEqual({ x: 0, y: 0, w: 60, h: 30 });
    expect(unionBox([])).toBeNull();
  });
});
