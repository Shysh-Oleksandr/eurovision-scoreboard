import { describe, expect, it } from 'vitest';

import type { DouzeLayer } from './model';
import { getDouzeMoveDelayMs, getDouzeSpec } from './registry';
import { year2022Douze } from './specs/year2022';
import {
  type AnchorRects,
  fillKeyframes,
  resolveBox,
  toWebKeyframes,
  toWindowKeyframes,
} from './timeline';

const anchors: AnchorRects = {
  row: { x: 40, y: 10, w: 400, h: 40 },
  flag: { x: 40, y: 10, w: 50, h: 40 },
  lastPoints: { x: 330, y: 10, w: 36, h: 40 },
  total: { x: 366, y: 10, w: 74, h: 40 },
};

const rect = (overrides: Partial<DouzeLayer> = {}): DouzeLayer =>
  ({
    id: 'test',
    kind: 'rect',
    fill: '#fff',
    box: { anchor: 'row' },
    keyframes: [],
    ...overrides,
  } as DouzeLayer);

describe('resolveBox', () => {
  it('places a box by shares of its anchor plus row heights', () => {
    expect(
      resolveBox({ anchor: 'row', x: 0.5, w: 0.1, y: -0.5, h: 2 }, anchors),
    ).toEqual({ x: 240, y: -10, w: 40, h: 80 });
    expect(
      resolveBox({ anchor: 'flag', x: 1, xRh: -1, wRh: 2 }, anchors),
    ).toEqual({ x: 50, y: 10, w: 80, h: 40 });
  });

  it('can take its vertical extent from another anchor', () => {
    const flagOnly = { ...anchors, flag: { x: 44, y: 18, w: 30, h: 24 } };

    expect(
      resolveBox({ anchor: 'flag', anchorY: 'row', y: -0.5, h: 2 }, flagOnly),
    ).toEqual({ x: 44, y: -10, w: 30, h: 80 });
  });

  it('skips layers whose part is not on the row', () => {
    expect(resolveBox({ anchor: 'name' }, anchors)).toBeNull();
  });
});

describe('fillKeyframes', () => {
  it('interpolates a property between the keyframes that set it', () => {
    const frames = fillKeyframes([
      { t: 100, x: 0.2 },
      { t: 0, opacity: 0 },
      { t: 200, opacity: 1 },
      { t: 300, x: 0.6 },
    ]);

    expect(frames.map((f) => [f.t, f.opacity, f.x])).toEqual([
      [0, 0, 0.2],
      [100, 0.5, 0.2],
      [200, 1, 0.4],
      [300, 1, 0.6],
    ]);
  });

  it('holds values that are not numbers', () => {
    const frames = fillKeyframes([
      { t: 0, x: { on: 'total' } },
      { t: 100, opacity: 0.5 },
      { t: 200, x: 0.5 },
    ]);

    expect(frames[1].x).toEqual({ on: 'total' });
  });
});

describe('toWebKeyframes', () => {
  it('holds the first and last values over the whole duration', () => {
    const web = toWebKeyframes(
      rect({
        keyframes: [
          { t: 500, opacity: 0, ease: 'ease-in' },
          { t: 750, opacity: 1 },
        ],
      }),
      anchors.row!,
      anchors,
      1000,
    );

    expect(web.map((k) => [k.offset, k.opacity, k.easing])).toEqual([
      [0, 0, 'linear'],
      [0.5, 0, 'ease-in'],
      [0.75, 1, 'linear'],
      [1, 1, 'linear'],
    ]);
  });

  it('moves in row widths or against a part, and interpolates between them', () => {
    const box = resolveBox({ anchor: 'lastPoints' }, anchors)!;
    const web = toWebKeyframes(
      rect({
        keyframes: [
          { t: 0, x: 0.25 },
          { t: 100, x: { on: 'total', at: 'centre', align: 'centre' } },
          { t: 150, opacity: 1 },
          { t: 200, x: { on: 'row', at: 'right' } },
          {
            t: 300,
            x: { on: 'total', at: 'left', align: 'right', offset: 0.1 },
          },
        ],
      }),
      box,
      anchors,
      300,
    );

    expect(web.map((k) => k.transform)).toEqual([
      'translate(100px, 0px) rotate(0deg) scale(1, 1)',
      // total centre 403 − box centre 348
      'translate(55px, 0px) rotate(0deg) scale(1, 1)',
      // halfway between 55 and 110
      'translate(82.5px, 0px) rotate(0deg) scale(1, 1)',
      // row right edge 440 − box left 330
      'translate(110px, 0px) rotate(0deg) scale(1, 1)',
      // total left 366 − box right 366 + 0.1 × 400
      'translate(40px, 0px) rotate(0deg) scale(1, 1)',
    ]);
  });

  it('clips a window on the clip box that stays put while the layer moves', () => {
    const layer = rect({
      clipTo: 'row',
      keyframes: [
        { t: 0, x: -0.5, windowLeft: 0.3, windowRight: 0.7 },
        { t: 100, windowRight: 0 },
        { t: 200, x: 0.2, windowLeft: 1 },
      ],
    });

    expect(toWindowKeyframes(layer, 200).map((k) => k.clipPath)).toEqual([
      'inset(-100% 70% -100% 30%)',
      'inset(-100% 0% -100% 65%)',
      'inset(-100% 0% -100% 100%)',
    ]);
    expect(toWindowKeyframes({ ...layer, clipTo: undefined }, 200)).toEqual([]);
  });

  it('turns reveal into a clip from the chosen side', () => {
    const web = toWebKeyframes(
      rect({
        revealFrom: 'right',
        keyframes: [
          { t: 0, reveal: 0.25 },
          { t: 100, reveal: 1 },
        ],
      }),
      anchors.row!,
      anchors,
      100,
    );

    expect(web.map((k) => k.clipPath)).toEqual([
      'inset(0 0 0 75%)',
      'inset(0 0 0 0%)',
    ]);
  });
});

describe('the 2022 spec', () => {
  it('has unique layers that stay inside its duration', () => {
    const ids = year2022Douze.layers.map((layer) => layer.id);

    expect(new Set(ids).size).toBe(ids.length);
    year2022Douze.layers.forEach((layer) => {
      layer.keyframes.forEach((frame) => {
        expect(frame.t).toBeGreaterThanOrEqual(0);
        expect(frame.t).toBeLessThanOrEqual(year2022Douze.durationMs);
      });
    });
  });

  it('keeps the 12 box on low-performance devices', () => {
    // The box layer hides the real box; dropping it would leave a gap.
    const box = year2022Douze.layers.find((layer) => layer.id === 'box');

    expect(box?.heavy).toBeFalsy();
  });

  it('makes the board wait for it, unlike the built-in variants', () => {
    expect(getDouzeSpec('year2022')).toBe(year2022Douze);
    expect(getDouzeSpec('heartsGrid')).toBeNull();
    expect(getDouzeMoveDelayMs('year2022')).toBeGreaterThan(
      year2022Douze.durationMs,
    );
    expect(getDouzeMoveDelayMs('heartsGrid')).toBe(1000);
  });
});
