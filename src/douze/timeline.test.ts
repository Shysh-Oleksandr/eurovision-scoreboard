import { describe, expect, it } from 'vitest';

import type { DouzeLayer } from './model';
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

  it('reveals up to an edge in the row, the same line on every layer', () => {
    const keyframes = [
      { t: 0, revealX: { on: 'flag', at: 'right' } as const },
      { t: 100, revealX: { on: 'total', at: 'left' } as const },
    ];
    // A box narrower and lower than the row: the clip still spans the
    // row's height and starts at its left edge, with a round end.
    const box = { x: 100, y: 18, w: 200, h: 24 };
    const web = toWebKeyframes(
      rect({ revealEdge: 'round', keyframes }),
      box,
      anchors,
      100,
    );

    // Edge at the flag's right edge (90), then the total's left (366).
    expect(web.map((k) => k.clipPath)).toEqual([
      'inset(-8px 210px -8px -60px round 0 20px 20px 0)',
      'inset(-8px -66px -8px -60px round 0 20px 20px 0)',
    ]);

    const whole = toWebKeyframes(
      rect({ keyframes }),
      anchors.row!,
      anchors,
      100,
    );

    expect(whole[0].clipPath).toBe(
      'inset(0px 350px 0px 0px round 0 0px 0px 0)',
    );

    // Row heights past the row's end (a round edge clear of its corners).
    const past = toWebKeyframes(
      rect({
        revealEdge: 'round',
        keyframes: [
          { t: 0, revealX: { on: 'row', at: 'right', offsetRh: 0.6 } },
        ],
      }),
      anchors.row!,
      anchors,
      100,
    );

    expect(past[0].clipPath).toBe(
      'inset(0px -24px 0px 0px round 0 20px 20px 0)',
    );
  });
});
