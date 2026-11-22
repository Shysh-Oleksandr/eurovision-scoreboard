import { describe, expect, it } from 'vitest';

import { dominantColors, paletteFromColors } from './flagPalette';

type Rgb = [number, number, number];

/** RGBA pixels for a w×h flag drawn by `colourAt(x, y)`. */
const flag = (
  w: number,
  h: number,
  colourAt: (x: number, y: number) => Rgb,
) => {
  const pixels: number[] = [];

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      pixels.push(...colourAt(x, y), 255);
    }
  }

  return pixels;
};

const RED: Rgb = [198, 54, 60];
const BLUE: Rgb = [12, 64, 118];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

describe('dominantColors', () => {
  it('reads horizontal stripes top to bottom (Serbia)', () => {
    const pixels = flag(30, 30, (_, y) =>
      y < 10 ? RED : y < 20 ? BLUE : WHITE,
    );

    expect(dominantColors(pixels)).toEqual(['#c6363c', '#0c4076', '#ffffff']);
  });

  it('puts whites and blacks after the colours, lightest first', () => {
    // Germany-like: black, red, gold; Estonia-like neutrals.
    const pixels = flag(30, 30, (_, y) =>
      y < 10 ? BLACK : y < 20 ? RED : [255, 206, 0],
    );

    expect(dominantColors(pixels)).toEqual(['#c6363c', '#ffce00', '#000000']);
  });

  it('keeps small saturated colours but drops small neutral details', () => {
    // A white field with a red disc (6 %) and a grey detail (4 %).
    const pixels = flag(50, 20, (x, y) => {
      if (x < 6 && y < 10) return RED;
      if (x >= 46 && y < 10) return [128, 128, 128];

      return WHITE;
    });

    expect(dominantColors(pixels)).toEqual(['#c6363c', '#ffffff']);
  });

  it('drops the blend two stripes make on their shared edge', () => {
    const pink: Rgb = [227, 155, 157];
    const pixels = flag(40, 30, (_, y) => {
      if (y < 14) return WHITE;
      if (y < 16) return pink;

      return RED;
    });

    expect(dominantColors(pixels)).toEqual(['#c6363c', '#ffffff']);
  });

  it('ignores transparent pixels', () => {
    const pixels = flag(10, 10, () => BLUE).map((value, i) =>
      i % 4 === 3 && i < 200 ? 0 : value,
    );

    expect(dominantColors(pixels)).toEqual(['#0c4076']);
  });
});

describe('paletteFromColors', () => {
  it('maps the colours to the spec keys, reusing the first for a third', () => {
    const palette = paletteFromColors(['#005bbb', '#ffd500']);

    expect(palette.c1).toBe('#005bbb');
    expect(palette.c2).toBe('#ffd500');
    expect(palette.c3).toBe('#005bbb');
    expect(palette.glow).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('can reuse the second for a third instead', () => {
    // 2023: the blue words on the c1 fill would vanish into it.
    expect(
      paletteFromColors(['#005bbb', '#ffd500'], { third: 'second' }).c3,
    ).toBe('#ffd500');
    expect(
      paletteFromColors(['#005bbb', '#ffd500', '#ffffff'], { third: 'second' })
        .c3,
    ).toBe('#ffffff');
  });

  it('lifts very dark colours so they show on the dark rows', () => {
    expect(paletteFromColors(['#000000']).c1).toBe('#666666');
  });

  it('keeps colours picked by hand as they are', () => {
    expect(paletteFromColors(['#000000'], { lift: false }).c1).toBe('#000000');
  });

  it('gives text a colour that reads on the first one', () => {
    expect(paletteFromColors(['#eba52c']).ink).toBe('#000000');
    expect(paletteFromColors(['#0038b8']).ink).toBe('#ffffff');
    expect(paletteFromColors(['#c8102e']).ink).toBe('#ffffff');
  });

  it('mixes a sheen and a shade from the first one, keeping greys grey', () => {
    // The 2026 broadcast's gold and its bands.
    expect(paletteFromColors(['#eba52c'])).toMatchObject({
      sheen: '#fcc463',
      shade: '#d78b08',
    });

    const { sheen, shade } = paletteFromColors(['#ffffff']);

    [sheen, shade].forEach((grey) => {
      expect(grey.slice(1, 3)).toBe(grey.slice(3, 5));
      expect(grey.slice(3, 5)).toBe(grey.slice(5, 7));
    });
  });
});
