import type { DouzePainter, DouzeSlabLine } from './model';

/**
 * Canvas painters: effects that change shape over time, so they are drawn
 * per frame from the animation's clock instead of moved as a picture. Pure
 * functions of (time state, size); the player calls them every frame while
 * playing and once per change while held.
 */

/** Painter inputs at one moment, in the canvas's own px. */
export interface PainterFrame {
  /** ms since the animation started. */
  t: number;
  /** Where the waves pinch, from the canvas's left edge. */
  pinchX: number;
  /** Visible span, from the canvas's left edge. */
  windowLeftX: number;
  windowRightX: number;
  /** The row's size, the unit painters' params are given in. */
  rowW: number;
  rowH: number;
  /** Slab painters: the followed part's resting box and where it is now. */
  slab?: SlabFrame;
}

/** A rounded box: x, y, w, h and the corner radii (tl, tr, br, bl), in px. */
export interface RoundedBox {
  x: number;
  y: number;
  w: number;
  h: number;
  radii: [number, number, number, number];
}

/** A slab painter's inputs, in the canvas's own px. */
export interface SlabFrame {
  /** Where the part rests (the slab's back). */
  back: RoundedBox;
  /** Where the part's transform puts it now (its face). */
  front: RoundedBox;
}

type Point = [number, number];

/**
 * The part of a rounded box's outline a lift up and to the left uncovers
 * (outward normals pointing right or down), as points: `right` from the
 * top-right corner's middle down to the bottom-right's middle, `bottom`
 * from there along the bottom to the bottom-left corner's middle.
 */
export const slabChains = (
  box: RoundedBox,
): { right: Point[]; bottom: Point[] } => {
  const [, tr, br, bl] = box.radii;
  const { x, y, w, h } = box;
  const arc = (
    cx: number,
    cy: number,
    r: number,
    from: number,
    to: number,
  ): Point[] => {
    if (r <= 0) return [[cx, cy]];

    const steps = Math.max(2, Math.ceil(r / 4));

    return Array.from({ length: steps + 1 }, (_, i) => {
      const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180;

      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
  };
  // Canvas angles: 0 is right, 90 is down.
  const right = [
    ...arc(x + w - tr, y + tr, tr, -45, 0),
    ...arc(x + w - br, y + h - br, br, 0, 45),
  ];
  const bottom = [
    ...arc(x + w - br, y + h - br, br, 45, 90),
    ...arc(x + bl, y + h - bl, bl, 90, 135),
  ];

  return { right, bottom };
};

/** The convex hull of points (monotone chain), counter-clockwise. */
export const convexHull = (points: Point[]): Point[] => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  if (sorted.length < 3) return sorted;

  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => {
    const chain: Point[] = [];

    list.forEach((point) => {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      ) {
        chain.pop();
      }
      chain.push(point);
    });
    chain.pop();

    return chain;
  };

  return [...half(sorted), ...half([...sorted].reverse())];
};

const polygonPath = (points: Point[]): Path2D => {
  const path = new Path2D();

  points.forEach(([px, py], index) =>
    index === 0 ? path.moveTo(px, py) : path.lineTo(px, py),
  );
  path.closePath();

  return path;
};

const roundedBoxPath = (box: RoundedBox): Path2D => {
  const path = new Path2D();

  path.roundRect(box.x, box.y, box.w, box.h, box.radii);

  return path;
};

/** No visible lift: nothing to draw (the slab lies flat). */
const isFlat = ({ back, front }: SlabFrame) =>
  Math.abs(front.x - back.x) < 0.25 &&
  Math.abs(front.y - back.y) < 0.25 &&
  Math.abs(front.w - back.w) < 0.25 &&
  Math.abs(front.h - back.h) < 0.25;

/** The slab's sides: everything between the back and the face. */
const sidesRegion = (slab: SlabFrame) => {
  const back = slabChains(slab.back);
  const front = slabChains(slab.front);

  return {
    // The right side is drawn over the whole region, so the two colours
    // meet without a seam of background between their edges.
    all: convexHull([
      ...back.right,
      ...back.bottom,
      ...front.right,
      ...front.bottom,
    ]),
    right: convexHull([...back.right, ...front.right]),
  };
};

/** The face stays the part's own: whatever was drawn over it goes. */
const eraseFace = (ctx: CanvasRenderingContext2D, slab: SlabFrame) => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(roundedBoxPath(slab.front));
  ctx.restore();
};

const paintSlabSides = (
  ctx: CanvasRenderingContext2D,
  slab: SlabFrame,
  colors: string[],
) => {
  if (isFlat(slab)) return;

  const { all, right } = sidesRegion(slab);

  ctx.fillStyle = colors[0] ?? '#fff';
  ctx.fill(polygonPath(all));
  ctx.fillStyle = colors[1] ?? colors[0] ?? '#fff';
  ctx.fill(polygonPath(right));
  eraseFace(ctx, slab);
};

const parseHex = (color: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());

  if (!match) return null;

  const value = parseInt(match[1], 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/**
 * The slab lines' colour: the side's own, lighter on a dark side and darker
 * on a light one (the broadcast's light blue lines on France's blue, dark
 * red on Iceland's red, orange on Lithuania's yellow).
 */
export const slabLineColor = (color: string): string => {
  const rgb = parseHex(color);

  if (!rgb) return color;

  const linear = rgb.map((channel) => {
    const c = channel / 255;

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const [r, g, b] = rgb.map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }

  const lightness = Math.min(
    0.92,
    Math.max(0.08, l + (luminance < 0.15 ? 0.2 : -0.07)),
  );

  return `hsl(${Math.round(((h * 60 + 360) % 360) * 10) / 10}, ${
    Math.round(s * 1000) / 10
  }%, ${Math.round(lightness * 1000) / 10}%)`;
};

const paintSlabLines = (
  ctx: CanvasRenderingContext2D,
  slab: SlabFrame,
  lines: DouzeSlabLine[],
  width: number,
  colors: string[],
) => {
  if (isFlat(slab)) return;

  const { all } = sidesRegion(slab);
  const { front, back } = slab;
  const depth = back.y + back.h - (front.y + front.h);

  if (depth <= 0) return;

  ctx.save();
  ctx.clip(polygonPath(all));
  ctx.strokeStyle = slabLineColor(colors[0] ?? '#fff');
  ctx.lineWidth = width;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  lines.forEach(({ at, slant }) => {
    const x = front.x + at * front.w;
    const top = front.y + front.h;

    ctx.moveTo(x, top);
    ctx.lineTo(x + slant * depth, top + depth);
  });
  ctx.stroke();
  ctx.restore();
  eraseFace(ctx, slab);
};

const smoothstep = (value: number) => {
  const x = Math.min(1, Math.max(0, value));

  return x * x * (3 - 2 * x);
};

/**
 * A lattice of waves flowing right (the 2022 cymatics mesh). Each family is
 * `lines` sinusoids with evenly spread phases; far from the pinch they cross
 * as straight diagonals (the amplitude reaches past the row, which clips
 * them), near it they close into a funnel and pass through a point (the
 * white beam, later the 12 box).
 */
const paintWaveFlow = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  painter: Extract<DouzePainter, { type: 'waveFlow' }>,
  frame: PainterFrame,
  colors: string[],
) => {
  const { rowW, rowH } = frame;
  const cy = h / 2;
  const flow = (painter.speed * rowW * frame.t) / 1000;
  const pinchHalf = painter.pinchWidth * rowW * 0.5;
  const pinchRadius = Math.max(1, painter.pinchRadius * rowW);
  const left = Math.max(0, frame.windowLeftX);
  const right = Math.min(w, frame.windowRightX);

  if (right <= left) return;

  const step = Math.max(2, rowH / 14);
  const families = [
    { wavelength: painter.wavelength, alpha: 0.95 },
    { wavelength: painter.wavelength * 1.18, alpha: 0.4 },
  ];
  const envelope = (x: number) =>
    smoothstep((Math.abs(x - frame.pinchX) - pinchHalf) / pinchRadius);

  const trace = (wavelengthPx: number, amplitude: number, phase: number) => {
    ctx.beginPath();
    for (let x = left; x <= right + step; x += step) {
      const px = Math.min(x, right);
      const y =
        cy +
        amplitude *
          envelope(px) *
          Math.sin(((px - flow) / wavelengthPx) * Math.PI * 2 + phase);

      if (px === left) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
  };

  families.forEach((family) => {
    const wavelengthPx = family.wavelength * rowH;
    const amplitude = painter.amplitude * rowH;

    for (let i = 0; i < painter.lines; i += 1) {
      const phase = (i / painter.lines) * Math.PI * 2;

      ctx.strokeStyle = colors[i % colors.length];
      // A wide faint pass under a thin bright one: the glow, without blur.
      trace(wavelengthPx, amplitude, phase);
      ctx.globalAlpha = 0.18 * family.alpha;
      ctx.lineWidth = painter.lineWidth * 3.5;
      ctx.stroke();
      ctx.globalAlpha = 0.85 * family.alpha;
      ctx.lineWidth = painter.lineWidth;
      ctx.stroke();
    }
  });

  ctx.globalAlpha = 1;

  // Where the lines collapse into one they stack into a hard bright line. In
  // the broadcast they vanish into something white (the beam, the 12 box),
  // so erase them around the pinch with a soft edge.
  const fade = pinchRadius * 0.35;
  const erase = ctx.createLinearGradient(
    frame.pinchX - pinchHalf - fade,
    0,
    frame.pinchX + pinchHalf + fade,
    0,
  );
  const inner = fade / (pinchHalf * 2 + fade * 2);

  erase.addColorStop(0, 'rgba(0,0,0,0)');
  erase.addColorStop(inner, 'rgba(0,0,0,1)');
  erase.addColorStop(1 - inner, 'rgba(0,0,0,1)');
  erase.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = erase;
  ctx.fillRect(frame.pinchX - pinchHalf - fade, 0, (pinchHalf + fade) * 2, h);

  // Soft edges on the window: fade the drawing out at both ends.
  const soft = Math.min((right - left) / 2, rowW * painter.edgeSoftness);

  ctx.globalCompositeOperation = 'destination-in';

  const mask = ctx.createLinearGradient(left, 0, right, 0);
  const span = right - left;

  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(soft / span, 'rgba(0,0,0,1)');
  mask.addColorStop(1 - soft / span, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
};

export const paint = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  painter: DouzePainter,
  frame: PainterFrame,
  colors: string[],
) => {
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (painter.type) {
    case 'waveFlow':
      paintWaveFlow(ctx, w, h, painter, frame, colors);
      break;
    case 'slabSides':
      if (frame.slab) paintSlabSides(ctx, frame.slab, colors);
      break;
    case 'slabLines':
      if (frame.slab) {
        paintSlabLines(
          ctx,
          frame.slab,
          painter.lines,
          Math.max(1, painter.width * frame.rowH),
          colors,
        );
      }
      break;
    default:
      break;
  }
};
