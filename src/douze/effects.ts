import type { DouzeEffect } from './model';

/**
 * SVG markup for the effects in model.ts, drawn at the layer's size in px
 * (the viewBox is the box), so circles stay round and lines stay thin
 * whatever the row's proportions. Pure and seeded: the same effect at the
 * same size draws the same picture. Colours go in `style` so `var(--douze-…)`
 * resolves inside the SVG.
 */

/** Small deterministic PRNG (mulberry32). */
const random = (seed: number) => {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

let gradientCounter = 0;
/** Unique within the document, so two players never share gradient ids. */
const uid = (name: string) => `douze-${name}-${(gradientCounter += 1)}`;

const n = (value: number) => Math.round(value * 10) / 10;

const svg = (w: number, h: number, body: string, clip = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${n(
    w,
  )} ${n(h)}" preserveAspectRatio="none" style="overflow:${
    clip ? 'hidden' : 'visible'
  };display:block">${body}</svg>`;

const tornBar = (w: number, h: number, color: string, seed: number) => {
  const rand = random(seed);
  const steps = 14;
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const y = (h * i) / steps;

    left.push(`${n(w * (0.18 + (rand() - 0.5) * 0.45))},${n(y)}`);
    right.push(`${n(w * (0.82 + (rand() - 0.5) * 0.45))},${n(y)}`);
  }

  const outline = [...left, ...right.reverse()].join(' ');
  // Torn-off fragments around the strip: the glitch.
  const fragments = Array.from({ length: 6 }, () => {
    const fw = w * (0.2 + rand() * 0.5);
    const fh = h * (0.03 + rand() * 0.06);
    const fx = rand() < 0.5 ? -fw * (0.4 + rand()) : w * (0.7 + rand() * 0.6);
    const fy = rand() * (h - fh);

    return `<rect x="${n(fx)}" y="${n(fy)}" width="${n(fw)}" height="${n(
      fh,
    )}" style="fill:${color};opacity:${n(0.4 + rand() * 0.5)}"/>`;
  }).join('');

  return svg(
    w,
    h,
    `<polygon points="${outline}" style="fill:${color}"/>` +
      `<rect x="${n(w * 0.38)}" y="0" width="${n(w * 0.24)}" height="${n(
        h,
      )}" style="fill:#fff;opacity:0.45"/>` +
      fragments,
  );
};

const arc = (
  w: number,
  h: number,
  color: string,
  bend: number,
  width: number,
) => {
  const x0 = w * 0.5 - (bend * w) / 2;
  const path = `M${n(x0)},0 Q${n(x0 + bend * w * 2)},${n(h / 2)} ${n(x0)},${n(
    h,
  )}`;

  return svg(
    w,
    h,
    `<path d="${path}" style="fill:none;stroke:${color};stroke-width:${n(
      width * 4,
    )};opacity:0.28;stroke-linecap:round"/>` +
      `<path d="${path}" style="fill:none;stroke:${color};stroke-width:${n(
        width * 2,
      )};opacity:0.45;stroke-linecap:round"/>` +
      `<path d="${path}" style="fill:none;stroke:#fff;stroke-width:${n(
        width * 0.6,
      )};opacity:0.9;stroke-linecap:round"/>` +
      `<path d="${path}" style="fill:none;stroke:${color};stroke-width:${n(
        width,
      )};stroke-linecap:round"/>`,
  );
};

const ring = (w: number, h: number, color: string, width: number) => {
  const r = Math.max(1, Math.min(w, h) / 2 - width * 2);
  const c = `cx="${n(w / 2)}" cy="${n(h / 2)}" r="${n(r)}"`;

  return svg(
    w,
    h,
    `<circle ${c} style="fill:none;stroke:${color};stroke-width:${n(
      width * 4,
    )};opacity:0.25"/>` +
      `<circle ${c} style="fill:none;stroke:${color};stroke-width:${n(
        width,
      )}"/>`,
  );
};

const star = (w: number, h: number, color: string) => {
  const gh = uid('star-h');
  const gv = uid('star-v');
  const gc = uid('star-c');
  const thin = Math.max(1, Math.min(w, h) * 0.035);

  return svg(
    w,
    h,
    `<defs>` +
      `<linearGradient id="${gh}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:${color};stop-opacity:0"/><stop offset="0.5" style="stop-color:${color};stop-opacity:1"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient>` +
      `<linearGradient id="${gv}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:0"/><stop offset="0.5" style="stop-color:${color};stop-opacity:1"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient>` +
      `<radialGradient id="${gc}"><stop offset="0" style="stop-color:#fff;stop-opacity:1"/><stop offset="0.35" style="stop-color:${color};stop-opacity:0.6"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></radialGradient>` +
      `</defs>` +
      `<ellipse cx="${n(w / 2)}" cy="${n(h / 2)}" rx="${n(w / 2)}" ry="${n(
        thin,
      )}" style="fill:url(#${gh})"/>` +
      `<ellipse cx="${n(w / 2)}" cy="${n(h / 2)}" rx="${n(thin)}" ry="${n(
        h / 2,
      )}" style="fill:url(#${gv})"/>` +
      `<circle cx="${n(w / 2)}" cy="${n(h / 2)}" r="${n(
        Math.min(w, h) * 0.22,
      )}" style="fill:url(#${gc})"/>`,
  );
};

const rays = (
  w: number,
  h: number,
  color: string,
  count: number,
  gap: number,
  seed: number,
) => {
  const rand = random(seed);
  const top = uid('ray-t');
  const bottom = uid('ray-b');
  const edge = (h * (1 - gap)) / 2;
  const lines = Array.from({ length: count }, (_, i) => {
    const x = w * ((i + 0.2 + rand() * 0.6) / count);
    const width = 0.8 + rand() * 1.4;
    const reach = edge * (0.45 + rand() * 0.55);

    return (
      `<rect x="${n(x)}" y="${n(edge - reach)}" width="${n(width)}" height="${n(
        reach,
      )}" style="fill:url(#${top})"/>` +
      `<rect x="${n(x + (rand() - 0.5) * 6)}" y="${n(h - edge)}" width="${n(
        width,
      )}" height="${n(
        reach * (0.6 + rand() * 0.4),
      )}" style="fill:url(#${bottom})"/>`
    );
  }).join('');

  return svg(
    w,
    h,
    `<defs>` +
      `<linearGradient id="${top}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:0"/><stop offset="1" style="stop-color:${color};stop-opacity:0.9"/></linearGradient>` +
      `<linearGradient id="${bottom}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:0.9"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient>` +
      `</defs>` +
      lines,
  );
};

const wavePath = (
  w: number,
  h: number,
  amplitude: number,
  halfWaves: number,
  phase: number,
  pinch: number,
) => {
  // About ten points per half-wave keeps the curves smooth at any length.
  const samples = Math.max(32, Math.ceil(halfWaves * 10));
  const points: string[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const x = (w * i) / samples;
    // The train opens from a point at the left (the beam's tip).
    const open = pinch > 0 ? Math.min(1, x / Math.max(1, w * pinch)) : 1;
    const envelope = open * open * (3 - 2 * open);
    const y =
      h / 2 +
      amplitude * envelope * Math.sin((Math.PI * halfWaves * x) / w + phase);

    points.push(`${n(x)},${n(y)}`);
  }

  return `M${points.join(' L')}`;
};

const strands = (
  w: number,
  h: number,
  colors: string[],
  count: number,
  spacing: number,
  seed: number,
  pinch: number,
  glow: boolean,
) => {
  const rand = random(seed);
  const maxAmplitude = h * 0.47;
  const halfWaves = w / Math.max(1, spacing * h);
  // The second family is shorter and shifted, so its lines cut across the
  // first family's lenses: the diamond mesh.
  const families = [
    { halfWaves, phase: 0, amplitude: 1, opacity: 0.8, width: 0.7 },
    {
      halfWaves: halfWaves * 1.6,
      phase: Math.PI / 2,
      amplitude: 0.85,
      opacity: 0.45,
      width: 0.55,
    },
  ];

  const lines = families.flatMap((family) =>
    Array.from({ length: count }, (_, i) => {
      // From -1 to 1: positive and negative amplitudes cross at every
      // node, which draws the X shapes and the lenses between them.
      const share = count > 1 ? (i / (count - 1)) * 2 - 1 : 1;

      return {
        d: wavePath(
          w,
          h,
          maxAmplitude * family.amplitude * share * (0.88 + rand() * 0.24),
          family.halfWaves,
          family.phase + (rand() - 0.5) * 0.25,
          pinch,
        ),
        color: colors[i % colors.length],
        width: family.width,
        opacity: family.opacity,
      };
    }),
  );

  const stroked = lines
    .map(
      (line) =>
        `<path d="${line.d}" style="fill:none;stroke:${line.color};stroke-width:${line.width};opacity:${line.opacity}"/>`,
    )
    .join('');

  if (!glow) return svg(w, h, stroked);

  // The glow is a blurred white copy drawn once with the picture; the layer
  // only ever moves, so it is never redrawn.
  const blur = uid('strands-glow');
  const glowed = lines
    .map(
      (line) =>
        `<path d="${line.d}" style="fill:none;stroke:#fff;stroke-width:${n(
          line.width * 2.5,
        )};opacity:${n(line.opacity * 0.3)}"/>`,
    )
    .join('');

  return svg(
    w,
    h,
    `<defs><filter id="${blur}" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="${n(
      Math.max(1, h * 0.04),
    )}"/></filter></defs>` +
      `<g filter="url(#${blur})">${glowed}</g>` +
      stroked,
  );
};

const beam = (w: number, h: number, core: string, edge: string) => {
  const g = uid('beam');
  // A spear: a rounded wide end on the left (where the waves feed in) and a
  // point on the right (where they fan out).
  const path =
    `M${n(w * 0.08)},${n(h * 0.1)} ` +
    `C${n(w * 0.45)},${n(h * 0.12)} ${n(w * 0.8)},${n(h * 0.38)} ${n(w)},${n(
      h / 2,
    )} ` +
    `C${n(w * 0.8)},${n(h * 0.62)} ${n(w * 0.45)},${n(h * 0.88)} ${n(
      w * 0.08,
    )},${n(h * 0.9)} ` +
    `C${n(-w * 0.03)},${n(h * 0.9)} ${n(-w * 0.03)},${n(h * 0.1)} ${n(
      w * 0.08,
    )},${n(h * 0.1)} Z`;

  return svg(
    w,
    h,
    `<defs><linearGradient id="${g}" x1="0" x2="0" y1="0" y2="1">` +
      `<stop offset="0" style="stop-color:${edge};stop-opacity:0.1"/>` +
      `<stop offset="0.12" style="stop-color:${edge};stop-opacity:0.55"/>` +
      `<stop offset="0.24" style="stop-color:${core};stop-opacity:1"/>` +
      `<stop offset="0.76" style="stop-color:${core};stop-opacity:1"/>` +
      `<stop offset="0.88" style="stop-color:${edge};stop-opacity:0.55"/>` +
      `<stop offset="1" style="stop-color:${edge};stop-opacity:0.1"/>` +
      `</linearGradient></defs>` +
      `<path d="${path}" style="fill:url(#${g})"/>`,
  );
};

const crossLines = (w: number, h: number, color: string, count: number) => {
  const lines: string[] = [];
  const step = (w + h * 2) / count;

  for (let i = 0; i <= count; i += 1) {
    const x = -h + i * step;

    lines.push(
      `<line x1="${n(x)}" y1="0" x2="${n(x + h)}" y2="${n(
        h,
      )}" style="stroke:${color};stroke-width:1;opacity:0.85"/>`,
      `<line x1="${n(x + h)}" y1="0" x2="${n(x)}" y2="${n(
        h,
      )}" style="stroke:${color};stroke-width:1;opacity:0.6"/>`,
    );
  }

  return svg(w, h, lines.join(''), true);
};

export const renderEffect = (
  effect: DouzeEffect,
  w: number,
  h: number,
): string => {
  if (w <= 0 || h <= 0) return '';

  switch (effect.type) {
    case 'tornBar':
      return tornBar(w, h, effect.color, effect.seed);
    case 'arc':
      return arc(w, h, effect.color, effect.bend, effect.width);
    case 'ring':
      return ring(w, h, effect.color, effect.width);
    case 'star':
      return star(w, h, effect.color);
    case 'rays':
      return rays(w, h, effect.color, effect.count, effect.gap, effect.seed);
    case 'strands':
      return strands(
        w,
        h,
        effect.colors,
        effect.count,
        effect.spacing,
        effect.seed,
        effect.pinch ?? 0,
        effect.glow ?? false,
      );
    case 'beam':
      return beam(w, h, effect.core, effect.edge);
    case 'crossLines':
      return crossLines(w, h, effect.color, effect.count);
    default:
      return '';
  }
};
