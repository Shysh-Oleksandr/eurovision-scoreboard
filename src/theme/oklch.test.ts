import { describe, expect, it } from 'vitest';

import {
  ACCENT_KEYFRAMES,
  BUILTIN_INTERFACE_ACCENTS,
} from './interfaceAccents';
import {
  AccentKeyframeRow,
  clampAccentToGamut,
  contrastRatio,
  getAutoAccents,
  getInterfaceTokens,
  getThemeInterfaceTokens,
  getThemeInterfaceVars,
  getThemePrimHue,
  hueDelta,
  maxChromaInGamut,
  MIN_INK_CONTRAST,
  oklchFromRgb,
  oklchHueFromCssColor,
  oklchHueFromRgb,
  oklchLuminance,
  oklchToRgb,
  parseCssColorToRgb,
  pickAccentInk,
} from './oklch';
import { YEARS_WITH_THEME } from './themes';

describe('oklch', () => {
  it('extracts the OKLCH hue of the sRGB primaries', () => {
    expect(oklchHueFromCssColor('#ff0000')).toBeCloseTo(29.2, 0);
    expect(oklchHueFromCssColor('#00ff00')).toBeCloseTo(142.5, 0);
    expect(oklchHueFromCssColor('#0000ff')).toBeCloseTo(264.1, 0);
  });

  it('parses hsl(), bare triplets, rgb() and short hex', () => {
    expect(parseCssColorToRgb('hsl(0, 100%, 50%)')).toEqual({
      r: 1,
      g: 0,
      b: 0,
    });
    expect(parseCssColorToRgb('120 100% 50%')).toEqual({ r: 0, g: 1, b: 0 });
    expect(parseCssColorToRgb('rgb(0, 0, 255)')).toEqual({ r: 0, g: 0, b: 1 });
    expect(parseCssColorToRgb('#f00')).toEqual({ r: 1, g: 0, b: 0 });
    expect(parseCssColorToRgb('nonsense')).toBeNull();
  });

  it('falls back for achromatic or unparseable colours', () => {
    expect(oklchHueFromRgb({ r: 0.5, g: 0.5, b: 0.5 })).toBeNull();
    expect(oklchHueFromCssColor('#808080', 123)).toBe(123);
    expect(oklchHueFromCssColor('garbage', 45)).toBe(45);
  });

  it('agrees between hsl and hex forms of the same colour', () => {
    expect(oklchHueFromCssColor('hsl(268, 61%, 36%)')).toBeCloseTo(
      oklchHueFromCssColor('#582494'),
      0,
    );
  });

  it('yields a finite hue in [0, 360) for every built-in theme', () => {
    for (const year of YEARS_WITH_THEME) {
      const hue = getThemePrimHue(year);

      expect(Number.isFinite(hue)).toBe(true);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('reads lightness and chroma along with the hue', () => {
    expect(oklchFromRgb({ r: 1, g: 1, b: 1 })).toEqual({
      L: 100,
      C: 0,
      H: null,
    });

    const navy = oklchFromRgb(parseCssColorToRgb('#031132')!);

    expect(navy.L).toBeGreaterThan(15);
    expect(navy.L).toBeLessThan(25);
    expect(navy.C).toBeGreaterThan(0.05);
    expect(Math.round(navy.H!)).toBe(262);
  });

  it('converts OKLCH back to sRGB (round trip) and measures contrast', () => {
    for (const hex of ['#c0392b', '#2e86de', '#f1c40f', '#8e44ad']) {
      const lch = oklchFromRgb(parseCssColorToRgb(hex)!);
      const rgb = oklchToRgb(lch.L, lch.C, lch.H!);
      const back = parseCssColorToRgb(hex)!;

      expect(rgb.r).toBeCloseTo(back.r, 2);
      expect(rgb.g).toBeCloseTo(back.g, 2);
      expect(rgb.b).toBeCloseTo(back.b, 2);
    }

    expect(contrastRatio(1, 0)).toBeCloseTo(21, 5);
    expect(oklchLuminance(100, 0, 0)).toBeCloseTo(1, 3);
    // Yellow holds far more chroma than blue at high lightness.
    expect(maxChromaInGamut(90, 105)).toBeGreaterThan(
      maxChromaInGamut(90, 265),
    );
  });

  it('clamps accents into sRGB and wraps hues', () => {
    const clamped = clampAccentToGamut({ h: 450, l: 66, c: 0.4 });

    expect(clamped.h).toBe(90);
    expect(clamped.c).toBeLessThan(0.4);
    expect(clamped.c).toBeCloseTo(maxChromaInGamut(66, 90), 2);
  });

  it('picks white ink for deep accents and dark ink for light ones', () => {
    expect(pickAccentInk({ h: 350, l: 62, c: 0.22 }).dark).toBe(false); // pink
    expect(pickAccentInk({ h: 105, l: 90, c: 0.16 }).dark).toBe(true); // lemon
    expect(pickAccentInk({ h: 88, l: 84, c: 0.13 }).dark).toBe(true); // gold
  });

  it('interpolates the auto curve between rows, the short way round', () => {
    const rows: AccentKeyframeRow[] = [
      {
        hue: 0,
        stops: [{ shade: 60, primL: 30, accent: { h: 350, l: 60, c: 0.2 } }],
      },
      {
        hue: 180,
        stops: [{ shade: 60, primL: 30, accent: { h: 30, l: 80, c: 0.1 } }],
      },
    ];

    const middle = getAutoAccents(90, 30, rows).accent;

    expect(middle.h).toBeCloseTo(10, 5); // 350 → 30 passes through 0, not 190
    expect(middle.l).toBeCloseTo(70, 5);
    expect(middle.c).toBeCloseTo(0.15, 5);
    // Wraps from the last row back to the first.
    expect(getAutoAccents(270, 30, rows).accent.h).toBeCloseTo(10, 5);
    // A stop without accent2 falls back to the hue − 40° rule.
    expect(getAutoAccents(0, 30, rows).accent2.h).toBeCloseTo(320, 5);
  });

  it('interpolates between shades and clamps beyond the ends', () => {
    const rows: AccentKeyframeRow[] = [
      {
        hue: 0,
        stops: [
          { shade: 35, primL: 20, accent: { h: 80, l: 70, c: 0.1 } },
          { shade: 85, primL: 40, accent: { h: 80, l: 90, c: 0.2 } },
        ],
      },
    ];

    expect(getAutoAccents(0, 30, rows).accent.l).toBeCloseTo(80, 5);
    expect(getAutoAccents(0, 5, rows).accent.l).toBe(70);
    expect(getAutoAccents(0, 60, rows).accent.l).toBe(90);
  });

  it('keeps the shipped auto curve continuous (no jumps while dragging hue)', () => {
    for (const primL of [24, 36, 48]) {
      let previous = getAutoAccents(0, primL).accent;

      for (let hue = 1; hue <= 360; hue += 1) {
        const next = getAutoAccents(hue, primL).accent;

        expect(Math.abs(hueDelta(previous.h, next.h))).toBeLessThan(6);
        expect(Math.abs(previous.l - next.l)).toBeLessThan(1.5);
        previous = next;
      }
    }
  });

  it('gives every shipped accent readable ink on the Start button', () => {
    const accents = [
      ...Object.values(BUILTIN_INTERFACE_ACCENTS).flatMap((a) =>
        a.accent2 ? [a.accent, a.accent2] : [a.accent],
      ),
      ...ACCENT_KEYFRAMES.flatMap((row) => row.stops.map((s) => s.accent)),
    ];

    for (const accent of accents) {
      expect(
        pickAccentInk(clampAccentToGamut(accent)).contrast,
      ).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
    }
  });

  it('uses the hand-picked accent of a built-in theme', () => {
    for (const year of Object.keys(BUILTIN_INTERFACE_ACCENTS)) {
      const tokens = getThemeInterfaceTokens(year);
      const picked = clampAccentToGamut(BUILTIN_INTERFACE_ACCENTS[year].accent);

      expect(tokens.accent).toEqual(picked);
    }
  });

  it('derives interface tokens from the primary ramp, with fallbacks', () => {
    const tokens = getInterfaceTokens({
      800: 'hsl(43, 61%, 28%)',
      900: 'hsl(43, 64%, 20%)',
    });

    expect(Math.round(tokens.hue)).toBe(87);
    expect(tokens.lightness).toBeGreaterThan(25);
    expect(tokens.lightness).toBeLessThan(45);
    expect(tokens.chroma).toBeGreaterThan(0.03);
    expect(tokens.accent).toEqual(
      clampAccentToGamut(getAutoAccents(tokens.hue, tokens.lightness).accent),
    );

    const picked = getInterfaceTokens(
      { 800: 'hsl(43, 61%, 28%)', 900: 'hsl(43, 64%, 20%)' },
      { accent: { h: 30, l: 70, c: 0.15 } },
    );

    expect(picked.accent).toEqual({ h: 30, l: 70, c: 0.15 });

    const fallback = getInterfaceTokens({ 800: 'garbage', 900: '#808080' });

    expect(fallback.hue).toBe(300);
    expect(fallback.lightness).toBeCloseTo(60, 0); // the gray's own lightness
    expect(fallback.chroma).toBe(0);
  });

  it('emits finite CSS variables for every built-in theme', () => {
    for (const year of YEARS_WITH_THEME) {
      const vars = getThemeInterfaceVars(year);

      Object.values(vars).forEach((value) => {
        expect(Number.isFinite(Number(value))).toBe(true);
      });
      expect(['0', '1']).toContain(vars['--accent-ink-dark']);
      expect(['0', '1']).toContain(vars['--accent-2-ink-dark']);
      expect(Number(vars['--prim-l'])).toBeGreaterThan(0);
      expect(Number(vars['--prim-l'])).toBeLessThan(100);
    }
  });
});
