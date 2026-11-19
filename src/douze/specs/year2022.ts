import type { DouzeAnimationSpec, DouzeKeyframe } from '../model';

/**
 * The 2022 douze: a glitch, three sweeps, a cymatics wave train and a wash.
 * Read frame by frame from two broadcast clips (timings ±33 ms) and checked
 * side by side in /dev/douze-lab; the breakdown lives in the local issue
 * tracker (.scratch/douze-animations/).
 *
 * The motion never stops: after the sweeps, the waves keep flowing right at
 * about 0.8 row widths a second and drain into the 12 box while their
 * trailing edge sweeps after them; the wash also arrives from the left.
 * Positions are in row widths unless placed against a part (the 12 box sits
 * further right on the app's rows than in the broadcast).
 *
 * Colours come from each country's flag, as in the broadcast (bar = first
 * colour, second sweep = second, ring = third; flagPalette.ts).
 */

/** Visible from `from` to `to`, switching instantly (the glitch frames). */
const flash = (from: number, to: number, x: number): DouzeKeyframe[] => [
  { t: 0, opacity: 0, x, ease: 'steps(1, end)' },
  { t: from, opacity: 1, ease: 'steps(1, end)' },
  { t: to, opacity: 0 },
];

/** The halo: in by 700 ms, held, out by 1480 ms. */
const veil = (peak: number): DouzeKeyframe[] => [
  { t: 250, opacity: 0, ease: 'cubic-bezier(0.4, 0, 0.6, 1)' },
  { t: 700, opacity: peak },
  { t: 1340, opacity: peak, ease: 'ease-in-out' },
  { t: 1480, opacity: 0 },
];

/** Centred `offset` row widths from the row's left edge. */
const inRow = (offset: number) =>
  ({ on: 'row', at: 'left', align: 'centre', offset } as const);

/** Centred `offset` row widths from the 12 box's left edge. */
const nearBox = (offset: number) =>
  ({ on: 'lastPoints', at: 'left', align: 'centre', offset } as const);

/**
 * The head of the wave train: where the waves pinch, with the white beam on
 * it. It leaves the name at 300 ms and runs into the 12 box by 870 ms.
 */
const HEAD: { t: number; at: ReturnType<typeof inRow | typeof nearBox> }[] = [
  { t: 300, at: inRow(0.3) },
  { t: 500, at: inRow(0.36) },
  { t: 600, at: inRow(0.43) },
  { t: 700, at: nearBox(-0.12) },
  { t: 800, at: nearBox(-0.03) },
  { t: 870, at: nearBox(0.01) },
  { t: 940, at: nearBox(0.04) },
];

const beamPath = (opacity: number): DouzeKeyframe[] => [
  { t: 300, opacity: 0, x: HEAD[0].at, scaleX: 0.4, scaleY: 0.6 },
  { t: 360, opacity },
  { t: 500, x: HEAD[1].at, scaleX: 0.8, scaleY: 0.85 },
  { t: 600, x: HEAD[2].at, scaleX: 1, scaleY: 1 },
  { t: 700, x: HEAD[3].at },
  { t: 800, x: HEAD[4].at, scaleY: 1.1 },
  { t: 870, x: HEAD[5].at, opacity: opacity * 0.85 },
  { t: 940, x: HEAD[6].at, opacity: 0 },
];

export const year2022Douze: DouzeAnimationSpec = {
  id: 'year2022',
  durationMs: 1500,
  reorder: 'after',
  // Each country in its own flag's colours, as in the broadcast; this
  // palette stays for flags that can't be read.
  flagPalette: true,
  palette: {
    c1: '#5ad8ff',
    c2: '#ff4f9a',
    c3: '#ffffff',
    glow: '#ffd6ea',
  },
  layers: [
    // 0–170 ms: the flag tears. A displaced copy smears up out of it and
    // three torn copies take turns over it.
    {
      id: 'smear',
      kind: 'clone',
      source: 'flag',
      heavy: true,
      glitch: { seed: 7, scale: 20, frequency: '0.03 0.25' },
      clipTo: 'row',
      box: { anchor: 'flag' },
      origin: 'right center',
      blend: 'screen',
      keyframes: [
        { t: 0, opacity: 0, scaleX: 1 },
        { t: 20, opacity: 0.55, scaleX: 1.08, y: -0.04 },
        { t: 100, opacity: 0.35, scaleX: 1.16, y: -0.06 },
        { t: 170, opacity: 0, scaleX: 1.2, y: -0.06 },
      ],
    },
    {
      id: 'tearA',
      kind: 'clone',
      source: 'flag',
      heavy: true,
      glitch: { seed: 3, scale: 10 },
      clipTo: 'row',
      box: { anchor: 'flag' },
      keyframes: flash(0, 50, -0.004),
    },
    {
      id: 'tearB',
      kind: 'clone',
      source: 'flag',
      heavy: true,
      glitch: { seed: 19, scale: 14 },
      clipTo: 'row',
      box: { anchor: 'flag' },
      keyframes: flash(50, 100, 0.006),
    },
    {
      id: 'tearC',
      kind: 'clone',
      source: 'flag',
      heavy: true,
      glitch: { seed: 42, scale: 8 },
      clipTo: 'row',
      box: { anchor: 'flag' },
      keyframes: flash(100, 150, -0.002),
    },

    // 90–340 ms: the 12 box slides in from past the row's right edge, over
    // the old total, into its place. The real box stays hidden until the
    // end, then takes over from the copy at the same spot.
    {
      id: 'box',
      kind: 'clone',
      source: 'lastPoints',
      hideSource: true,
      clipTo: 'row',
      // Under the total, as in the row: it slides out from beneath it and
      // keeps the curved edge the total draws over it.
      cutBy: ['total'],
      box: { anchor: 'lastPoints' },
      keyframes: [
        { t: 0, x: { on: 'row', at: 'right' } },
        {
          t: 90,
          x: { on: 'row', at: 'right' },
          ease: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
        },
        { t: 340, x: 0 },
      ],
    },

    // 200–1480 ms: the white veil. Its soft edge crosses the row from the
    // flag to past the total by 700 ms (the broadcast's right end stays dark
    // the longest), then the whole veil fades.
    {
      id: 'wash',
      kind: 'rect',
      // White for the first 1.3 row widths, then a soft edge; the layer's
      // left end never comes past the row's, so the flag stays covered.
      fill: 'linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) 55%, rgba(255,255,255,0) 62%)',
      clipTo: 'row',
      box: { anchor: 'row', w: 2.4 },
      keyframes: [
        { t: 200, opacity: 1, x: -1.4 },
        { t: 400, x: -0.85 },
        { t: 550, x: -0.68 },
        { t: 700, x: -0.25 },
        { t: 1340, opacity: 1, ease: 'ease-in-out' },
        { t: 1480, opacity: 0 },
      ],
    },
    {
      id: 'halo',
      kind: 'rect',
      heavy: true,
      fill: 'transparent',
      // In the row's shape: a pill on rounded themes.
      radius: 'anchor',
      shadow:
        '0 0 14px 3px color-mix(in srgb, var(--douze-glow) 75%, transparent)',
      box: { anchor: 'row' },
      keyframes: veil(1),
    },

    // 0–125 ms: bar 1 appears mid-row and sweeps to the right edge.
    {
      id: 'bar',
      kind: 'effect',
      effect: { type: 'tornBar', color: 'var(--douze-c1)', seed: 2022 },
      clipTo: 'row',
      box: { anchor: 'row', w: 0.03, y: -0.04, h: 1.08 },
      keyframes: [
        { t: 0, opacity: 1, x: 0.44 },
        { t: 100, opacity: 1, x: 0.95 },
        { t: 125, opacity: 0, x: 0.99 },
      ],
    },

    // 130–350 ms: the second sweep crawls out past the flag, then races to
    // the right edge (about 17 % of the row a frame), trailing colour.
    {
      id: 'trail',
      kind: 'rect',
      heavy: true,
      fill: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--douze-c2) 30%, transparent) 70%, color-mix(in srgb, var(--douze-c2) 45%, transparent) 92%, transparent 100%)',
      clipTo: 'row',
      box: { anchor: 'row', x: 0.14, w: 0.3 },
      blend: 'screen',
      keyframes: [
        { t: 140, opacity: 0, x: -0.05 },
        { t: 200, opacity: 0.8, x: 0.02 },
        { t: 300, opacity: 0.5, x: 0.5 },
        { t: 380, opacity: 0, x: 0.6 },
      ],
    },
    {
      id: 'sweep2',
      kind: 'effect',
      effect: { type: 'arc', color: 'var(--douze-c2)', bend: 0.35, width: 2 },
      clipTo: 'row',
      box: { anchor: 'row', w: 0.035, y: -0.08, h: 1.16 },
      blend: 'screen',
      keyframes: [
        { t: 125, opacity: 0, x: 0.2 },
        { t: 140, opacity: 1, x: 0.21 },
        { t: 180, x: 0.25 },
        { t: 200, x: 0.33 },
        { t: 333, opacity: 1, x: 0.97 },
        { t: 350, opacity: 0, x: 1 },
      ],
    },

    // 80–720 ms: the burst where the flag meets the name, with rays.
    {
      id: 'bloom',
      kind: 'rect',
      fill: 'radial-gradient(closest-side, rgba(255,255,255,0.95) 0%, color-mix(in srgb, var(--douze-glow) 70%, transparent) 32%, color-mix(in srgb, var(--douze-c2) 25%, transparent) 62%, transparent 100%)',
      box: {
        anchor: 'flag',
        anchorY: 'row',
        x: 1,
        xRh: -1.7,
        wRh: 3.4,
        y: -0.6,
        h: 2.2,
      },
      blend: 'screen',
      keyframes: [
        {
          t: 80,
          opacity: 0,
          scale: 0.4,
          ease: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
        },
        { t: 200, opacity: 0.9, scale: 0.9 },
        { t: 330, opacity: 1, scale: 1 },
        { t: 480, opacity: 0.7, scale: 1.12 },
        { t: 720, opacity: 0, scale: 1.2 },
      ],
    },
    {
      id: 'rays',
      kind: 'effect',
      heavy: true,
      effect: {
        type: 'rays',
        color: '#ffffff',
        count: 7,
        gap: 0.36,
        seed: 11,
      },
      box: {
        anchor: 'flag',
        anchorY: 'row',
        x: 0.6,
        xRh: -0.5,
        wRh: 4.5,
        y: -0.9,
        h: 2.8,
      },
      blend: 'screen',
      keyframes: [
        { t: 200, opacity: 0 },
        { t: 350, opacity: 0.9 },
        { t: 800, opacity: 0.5 },
        { t: 1250, opacity: 0 },
      ],
    },
    {
      id: 'star',
      kind: 'effect',
      effect: { type: 'star', color: '#ffffff' },
      box: {
        anchor: 'flag',
        anchorY: 'row',
        x: 1,
        xRh: -1.4,
        wRh: 2.8,
        y: -0.7,
        h: 2.4,
      },
      blend: 'screen',
      keyframes: [
        { t: 200, opacity: 0, scale: 0.3 },
        { t: 320, opacity: 1, scale: 1 },
        { t: 560, opacity: 0, scale: 1.15 },
      ],
    },

    // 300–1300 ms: the wave train, drawn per frame: a lattice of waves
    // flowing right at a steady pace, pinched through the beam (and then
    // the 12 box). Its front edge runs ahead to the right edge by 800 ms;
    // its trailing edge sweeps after it from 930 ms, so the motion never
    // stops until the waves have drained past the total.
    {
      id: 'waves',
      kind: 'canvas',
      heavy: true,
      painter: {
        type: 'waveFlow',
        colors: [
          '#ffffff',
          'var(--douze-glow)',
          '#ffffff',
          'var(--douze-c2)',
          '#ffffff',
          'var(--douze-glow)',
          '#ffffff',
          'var(--douze-c1)',
        ],
        lines: 12,
        wavelength: 4.4,
        amplitude: 0.75,
        speed: 0.8,
        // Shorter than the spear and the 12 box: the waves collapse out of
        // sight inside them.
        pinchWidth: 0.08,
        pinchRadius: 0.16,
        lineWidth: 0.8,
        edgeSoftness: 0.05,
      },
      clipTo: 'row',
      box: { anchor: 'row' },
      blend: 'screen',
      keyframes: [
        {
          t: 300,
          opacity: 0,
          pinch: 0.3,
          windowLeft: 0.24,
          windowRight: 0.66,
        },
        { t: 340, opacity: 1 },
        { t: 400, windowRight: 0.45 },
        { t: 500, pinch: 0.36, windowRight: 0.32 },
        { t: 600, pinch: 0.43, windowRight: 0.25 },
        { t: 700, pinch: { on: 'lastPoints', at: 'left', offset: -0.12 } },
        {
          t: 800,
          pinch: { on: 'lastPoints', at: 'left', offset: -0.03 },
          windowRight: 0,
        },
        { t: 900, pinch: { on: 'lastPoints', at: 'centre' }, windowLeft: 0.24 },
        { t: 930, windowLeft: 0.26 },
        { t: 1230, opacity: 1, windowLeft: 0.8 },
        { t: 1300, opacity: 0, windowLeft: 1 },
      ],
    },
    {
      // The pink glow at the train's front edge.
      id: 'front',
      kind: 'rect',
      heavy: true,
      fill: 'radial-gradient(closest-side, color-mix(in srgb, var(--douze-c2) 55%, transparent) 0%, color-mix(in srgb, var(--douze-c2) 20%, transparent) 55%, transparent 100%)',
      clipTo: 'row',
      box: { anchor: 'row', w: 0.16, y: -0.15, h: 1.3 },
      blend: 'screen',
      keyframes: [
        { t: 300, opacity: 0, x: 0.22 },
        { t: 360, opacity: 1 },
        { t: 450, x: 0.43 },
        { t: 600, opacity: 1, x: 0.63 },
        { t: 720, opacity: 0, x: 0.78 },
      ],
    },

    // 300–940 ms: the white beam rides the train's pinch and runs into the
    // 12 box, inside a soft white glow.
    {
      id: 'beamGlow',
      kind: 'rect',
      fill: 'radial-gradient(closest-side, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 45%, color-mix(in srgb, var(--douze-glow) 25%, transparent) 75%, transparent 100%)',
      box: { anchor: 'row', w: 0.34, y: -0.4, h: 1.8 },
      blend: 'screen',
      keyframes: beamPath(1),
    },
    {
      id: 'beam',
      kind: 'effect',
      effect: { type: 'beam', core: '#ffffff', edge: 'var(--douze-c2)' },
      clipTo: 'row',
      box: { anchor: 'row', w: 0.2, y: 0.06, h: 0.88 },
      keyframes: beamPath(0.95),
    },

    // 390–760 ms: the ring opens round the flag (the row cuts it to "( )"),
    // then its right side sweeps to the right edge and flashes the 12 box on
    // the way.
    {
      id: 'ring',
      kind: 'effect',
      effect: { type: 'ring', color: 'var(--douze-c3)', width: 1.6 },
      clipTo: 'row',
      box: {
        anchor: 'flag',
        anchorY: 'row',
        x: 0.5,
        xRh: -0.8,
        wRh: 1.6,
        y: -0.3,
        h: 1.6,
      },
      blend: 'screen',
      keyframes: [
        {
          t: 390,
          opacity: 0,
          scale: 0.25,
          ease: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
        },
        { t: 420, opacity: 1 },
        { t: 490, opacity: 1, scale: 1 },
        { t: 520, opacity: 0, scale: 1.08 },
      ],
    },
    {
      id: 'sweep3',
      kind: 'effect',
      effect: { type: 'arc', color: 'var(--douze-c3)', bend: 0.35, width: 2 },
      clipTo: 'row',
      box: { anchor: 'row', w: 0.035, y: -0.08, h: 1.16 },
      blend: 'screen',
      keyframes: [
        { t: 480, opacity: 0, x: 0.12 },
        { t: 500, opacity: 1, x: 0.14 },
        { t: 533, x: 0.22 },
        { t: 567, x: 0.25 },
        { t: 600, x: 0.35 },
        { t: 733, opacity: 1, x: 0.97 },
        { t: 755, opacity: 0, x: 1 },
      ],
    },

    // 600–1280 ms: the 12 box flashes white in its own shape (a white
    // silhouette of the box, so pointed or rounded boxes stay that shape)
    // and holds while the waves drain into it.
    {
      id: 'boxFlash',
      kind: 'clone',
      source: 'lastPoints',
      filter: 'brightness(0) invert(1)',
      clipTo: 'row',
      cutBy: ['total'],
      box: { anchor: 'lastPoints' },
      keyframes: [
        { t: 600, opacity: 0 },
        { t: 665, opacity: 0.35 },
        { t: 690, opacity: 1 },
        { t: 1200, opacity: 1, ease: 'ease-in-out' },
        { t: 1280, opacity: 0 },
      ],
    },
  ],
};
