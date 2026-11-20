import { describe, expect, it } from 'vitest';

import type { DouzeAnimationSpec, DouzeLayer } from './model';
import {
  applyDouzeOptions,
  douzeDurationScale,
  restrictDouzeOptions,
  sanitizeDouzeOptions,
  withDouzeOptions,
} from './options';
import {
  getDouzeMoveDelayMs,
  getDouzeOptionsSupport,
  getDouzeSpec,
} from './registry';
import { year2022Douze } from './specs/year2022';

const layer = (overrides: Partial<DouzeLayer>): DouzeLayer =>
  ({
    kind: 'rect',
    fill: '#fff',
    box: { anchor: 'row' },
    keyframes: [],
    ...overrides,
  } as DouzeLayer);

const spec: DouzeAnimationSpec = {
  id: 'test',
  durationMs: 1000,
  reorder: 'after',
  paletteFrom: 'flag',
  parts: ['burst', 'wash'],
  palette: { c1: '#111111', c2: '#222222', c3: '#333333', glow: '#444444' },
  layers: [
    layer({
      id: 'box',
      keyframes: [
        { t: 0, x: 1 },
        { t: 400, x: 0 },
      ],
    }),
    layer({
      id: 'bloom',
      group: 'burst',
      intensity: 'glow',
      keyframes: [
        { t: 100, opacity: 0 },
        { t: 300, opacity: 0.8 },
        { t: 600, x: 0.2 },
      ],
    }),
    layer({
      id: 'veil',
      group: 'wash',
      intensity: 'wash',
      keyframes: [{ t: 200 }, { t: 900 }],
    }),
    {
      id: 'waves',
      kind: 'canvas',
      box: { anchor: 'row' },
      painter: {
        type: 'waveFlow',
        colors: ['#fff'],
        lines: 4,
        wavelength: 4,
        amplitude: 0.5,
        speed: 0.8,
        pinchWidth: 0.1,
        pinchRadius: 0.1,
        lineWidth: 1,
        edgeSoftness: 0.05,
      },
      keyframes: [{ t: 500, opacity: 1 }],
    },
  ],
};

const ids = (applied: DouzeAnimationSpec) =>
  applied.layers.map((each) => each.id);

describe('sanitizeDouzeOptions', () => {
  it('keeps valid options and leaves defaults out', () => {
    expect(
      sanitizeDouzeOptions({
        colors: 'theme',
        speed: 1,
        off: ['wash', 'burst', 'wash'],
        glow: 0.5,
        wash: 1,
      }),
    ).toEqual({ colors: 'theme', off: ['burst', 'wash'], glow: 0.5 });
  });

  it('clamps numbers into their ranges', () => {
    expect(sanitizeDouzeOptions({ speed: 3, glow: -1, wash: 0.333 })).toEqual({
      speed: 2,
      glow: 0,
      wash: 0.33,
    });
  });

  it('needs three hex colours for custom colours', () => {
    expect(
      sanitizeDouzeOptions({
        colors: 'custom',
        custom: ['#FF0000', '#00ff00', '#0000ff'],
      }),
    ).toEqual({ colors: 'custom', custom: ['#ff0000', '#00ff00', '#0000ff'] });
    expect(
      sanitizeDouzeOptions({ colors: 'custom', custom: ['red', '#00ff00'] }),
    ).toBeNull();
  });

  it('drops unknown keys, bad part ids and anything that is not an object', () => {
    expect(
      sanitizeDouzeOptions({
        colors: 'rainbow',
        off: ['ok', 'Bad id', 4],
        x: 1,
      }),
    ).toEqual({ off: ['ok'] });
    expect(sanitizeDouzeOptions('fast')).toBeNull();
    expect(sanitizeDouzeOptions([])).toBeNull();
    expect(sanitizeDouzeOptions({})).toBeNull();
  });
});

describe('the veil colour', () => {
  it('keeps a hex colour other than white', () => {
    expect(sanitizeDouzeOptions({ veil: '#FFD700' })).toEqual({
      veil: '#ffd700',
    });
    expect(sanitizeDouzeOptions({ veil: '#ffffff' })).toBeNull();
    expect(sanitizeDouzeOptions({ veil: 'gold' })).toBeNull();
  });

  it('tints the veil in the palette', () => {
    expect(applyDouzeOptions(spec, { veil: '#ffd700' }).palette.veil).toBe(
      '#ffd700',
    );
  });
});

describe('covering the flag', () => {
  it('is kept only when switched on', () => {
    expect(sanitizeDouzeOptions({ coverFlag: true })).toEqual({
      coverFlag: true,
    });
    expect(sanitizeDouzeOptions({ coverFlag: false })).toBeNull();
    expect(sanitizeDouzeOptions({ coverFlag: 'yes' })).toBeNull();
  });

  it('is offered by the hearts only', () => {
    expect(
      restrictDouzeOptions(
        { coverFlag: true },
        getDouzeOptionsSupport('heartsGrid'),
      ),
    ).toEqual({ coverFlag: true });
    expect(
      restrictDouzeOptions(
        { coverFlag: true },
        getDouzeOptionsSupport('parallelograms'),
      ),
    ).toBeNull();
    expect(
      restrictDouzeOptions(
        { coverFlag: true },
        getDouzeOptionsSupport('year2022'),
      ),
    ).toBeNull();
  });
});

describe('restrictDouzeOptions', () => {
  const hearts = getDouzeOptionsSupport('heartsGrid');

  it('keeps only what the animation offers', () => {
    expect(
      restrictDouzeOptions(
        {
          colors: 'custom',
          custom: ['#000000', '#00ff00', '#0000ff'],
          speed: 1.5,
          off: ['glitch', 'name'],
          glow: 0.5,
          veil: '#ffd700',
        },
        hearts,
      ),
    ).toEqual({ speed: 1.5, off: ['name'] });
  });

  it("stores the animation's own colours as no choice", () => {
    expect(restrictDouzeOptions({ colors: 'theme' }, hearts)).toBeNull();
    expect(restrictDouzeOptions({ colors: 'flag' }, hearts)).toEqual({
      colors: 'flag',
    });
    expect(
      restrictDouzeOptions(
        { colors: 'flag' },
        getDouzeOptionsSupport('year2022'),
      ),
    ).toBeNull();
  });

  it('has nothing to keep without support', () => {
    expect(restrictDouzeOptions({ speed: 1.5 }, null)).toBeNull();
  });
});

describe('douzeDurationScale', () => {
  it('is how much longer the animation runs', () => {
    expect(douzeDurationScale(null)).toBe(1);
    expect(douzeDurationScale({ speed: 0.5 })).toBe(2);
    expect(douzeDurationScale({ speed: 2 })).toBe(0.5);
  });
});

describe('applyDouzeOptions', () => {
  it('leaves out the parts switched off, never the layers without a part', () => {
    expect(ids(applyDouzeOptions(spec, { off: ['burst', 'wash'] }))).toEqual([
      'box',
      'waves',
    ]);
  });

  it('scales the strength of tagged layers, and drops them at zero', () => {
    const applied = applyDouzeOptions(spec, { glow: 0.5, wash: 0 });
    const bloom = applied.layers.find((each) => each.id === 'bloom')!;

    expect(bloom.keyframes.map((frame) => frame.opacity)).toEqual([
      0,
      0.4,
      undefined,
    ]);
    expect(ids(applied)).not.toContain('veil');
  });

  it('gives a tagged layer without opacity keyframes its strength', () => {
    const veil = applyDouzeOptions(spec, { wash: 0.5 }).layers.find(
      (each) => each.id === 'veil',
    )!;

    expect(veil.keyframes[0].opacity).toBe(0.5);
  });

  it('rescales the clock and the waves with the speed', () => {
    const applied = applyDouzeOptions(spec, { speed: 1.25 });
    const waves = applied.layers.find((each) => each.id === 'waves')!;

    expect(applied.durationMs).toBe(800);
    expect(applied.layers[0].keyframes.map((frame) => frame.t)).toEqual([
      0, 320,
    ]);
    expect(waves.kind === 'canvas' && waves.painter.speed).toBe(1);
  });

  it('takes the colours from the theme, or from custom colours as picked', () => {
    expect(applyDouzeOptions(spec, { colors: 'theme' }).paletteFrom).toBe(
      'theme',
    );

    const custom = applyDouzeOptions(spec, {
      colors: 'custom',
      custom: ['#000000', '#00ff00', '#0000ff'],
    });

    expect(custom.paletteFrom).toBeUndefined();
    expect(custom.palette).toMatchObject({
      c1: '#000000',
      c2: '#00ff00',
      c3: '#0000ff',
    });
  });

  it('keeps the spec unchanged without options', () => {
    expect(withDouzeOptions(spec, null)).toBe(spec);
    expect(withDouzeOptions(spec, { speed: 1 })).toBe(spec);
    expect(withDouzeOptions(spec, { glow: 0.5 })).toBe(
      withDouzeOptions(spec, { glow: 0.5 }),
    );
  });
});

describe('the registry with options', () => {
  it('tells what each animation offers', () => {
    expect(getDouzeOptionsSupport('year2022')).toEqual({
      colors: ['flag', 'theme', 'custom'],
      themeColors: [{ key: 'douzePointsBg', label: 'douze', when: 'theme' }],
      parts: ['glitch', 'sweeps', 'burst', 'waves', 'flash', 'wash'],
      strengths: ['glow', 'wash'],
      veilColor: true,
      coverFlag: false,
    });
    expect(getDouzeOptionsSupport('parallelograms')?.parts).toEqual([
      'blocks',
      'label',
    ]);
    expect(getDouzeOptionsSupport('heartsGrid')?.colors).toEqual([
      'theme',
      'flag',
    ]);
  });

  it('applies them, and the board waits for the slower animation', () => {
    const slower = getDouzeSpec('year2022', { speed: 0.8 })!;

    expect(slower.durationMs).toBe(year2022Douze.durationMs / 0.8);
    expect(getDouzeMoveDelayMs('year2022', { speed: 0.8 })).toBe(
      Math.round(slower.durationMs) + 150,
    );
  });
});
