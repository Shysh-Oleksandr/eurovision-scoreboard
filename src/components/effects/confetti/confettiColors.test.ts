import { describe, expect, it } from 'vitest';

import { pickDominantColors, themeConfettiPalette } from './confettiColors';

/** RGBA pixels: `count` copies of each colour. */
const pixels = (
  ...runs: { rgba: [number, number, number, number]; count: number }[]
) => {
  const out: number[] = [];

  for (const { rgba, count } of runs) {
    for (let i = 0; i < count; i += 1) out.push(...rgba);
  }

  return new Uint8ClampedArray(out);
};

describe('pickDominantColors', () => {
  it('returns a flag’s fields, largest first, without the anti-aliased edges', () => {
    const sweden = pixels(
      { rgba: [0, 106, 167, 255], count: 600 },
      { rgba: [254, 204, 0, 255], count: 380 },
      // A blended edge pixel run, under the 3% share.
      { rgba: [127, 155, 84, 255], count: 20 },
    );

    expect(pickDominantColors(sweden)).toEqual(['#006aa7', '#fecc00']);
  });

  it('merges near-identical colours and ignores transparent pixels', () => {
    const image = pixels(
      { rgba: [200, 16, 46, 255], count: 500 },
      { rgba: [210, 20, 50, 255], count: 300 },
      { rgba: [255, 255, 255, 255], count: 200 },
      { rgba: [0, 0, 0, 0], count: 5000 },
    );

    expect(pickDominantColors(image)).toEqual(['#c8102e', '#ffffff']);
  });

  it('drops the mixes left by the edges of thin stripes', () => {
    const greece = pixels(
      { rgba: [13, 94, 175, 255], count: 500 },
      { rgba: [255, 255, 255, 255], count: 380 },
      // 75% white, 25% blue: a stripe edge.
      { rgba: [195, 215, 235, 255], count: 70 },
      { rgba: [134, 175, 215, 255], count: 50 },
    );

    expect(pickDominantColors(greece)).toEqual(['#0d5eaf', '#ffffff']);
  });

  it('keeps a third field that is not a mix of the others', () => {
    const germany = pixels(
      { rgba: [0, 0, 0, 255], count: 330 },
      { rgba: [221, 0, 0, 255], count: 330 },
      { rgba: [255, 206, 0, 255], count: 330 },
    );

    expect(pickDominantColors(germany)).toEqual([
      '#000000',
      '#dd0000',
      '#ffce00',
    ]);
  });

  it('caps the number of colours', () => {
    const image = pixels(
      { rgba: [255, 0, 0, 255], count: 100 },
      { rgba: [0, 255, 0, 255], count: 90 },
      { rgba: [0, 0, 255, 255], count: 80 },
    );

    expect(pickDominantColors(image, { max: 2 })).toEqual([
      '#ff0000',
      '#00ff00',
    ]);
  });

  it('returns nothing for a fully transparent image', () => {
    expect(
      pickDominantColors(pixels({ rgba: [0, 0, 0, 0], count: 10 })),
    ).toEqual([]);
  });
});

describe('themeConfettiPalette', () => {
  it('gives distinct hex colours derived from the accents', () => {
    const palette = themeConfettiPalette(
      { h: 88, l: 84, c: 0.13 },
      { h: 101, l: 65, c: 0.105 },
    );

    expect(palette.length).toBeGreaterThanOrEqual(4);
    expect(new Set(palette).size).toBe(palette.length);
    palette.forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/));
  });
});
