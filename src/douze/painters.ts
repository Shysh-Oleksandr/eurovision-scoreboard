import type { DouzePainter } from './model';

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
}

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
    default:
      break;
  }
};
