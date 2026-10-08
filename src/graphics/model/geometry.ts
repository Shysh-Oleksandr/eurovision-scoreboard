/**
 * Transform math for the editor. Pure, unit-tested (geometry.test.ts).
 *
 * Coordinates are in *design* units (canvas px). Screen → design conversion
 * is the caller's job: divide pointer deltas by the stage zoom.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, around the rect's centre. */
  rotation: number;
}

export interface Point {
  x: number;
  y: number;
}

export type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const SIDE_HANDLES: HandleId[] = ['e', 'w'];

const DEG = Math.PI / 180;

export const center = (r: Rect): Point => ({
  x: r.x + r.w / 2,
  y: r.y + r.h / 2,
});

export function rotatePoint(p: Point, deg: number): Point {
  const a = deg * DEG;
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Direction of a handle: -1 | 0 | 1 per axis. */
export function handleDirection(h: HandleId): Point {
  return {
    x: h.includes('e') ? 1 : h.includes('w') ? -1 : 0,
    y: h.includes('s') ? 1 : h.includes('n') ? -1 : 0,
  };
}

/**
 * Resize `start` by dragging handle `h` with a pointer delta (design units,
 * screen axes). The opposite edge/corner stays fixed, also when rotated.
 */
export function resizeRect(
  start: Rect,
  h: HandleId,
  delta: Point,
  opts: { keepAspect?: boolean; minSize?: number } = {},
): Rect {
  const minSize = opts.minSize ?? 8;
  const dir = handleDirection(h);
  // Pointer delta in the element's local (unrotated) axes.
  const local = rotatePoint(delta, -start.rotation);

  let dw = dir.x * local.x;
  let dh = dir.y * local.y;

  if (opts.keepAspect && dir.x !== 0 && dir.y !== 0) {
    const ratio = start.w / start.h;

    if (Math.abs(dw) > Math.abs(dh) * ratio) {
      dh = dw / ratio;
    } else {
      dw = dh * ratio;
    }
  }

  const w = Math.max(minSize, start.w + dw);
  const hgt = Math.max(minSize, start.h + dh);
  const realDw = w - start.w;
  const realDh = hgt - start.h;

  // The centre moves by half the size change, along the handle direction,
  // expressed back in screen axes so the anchored side does not move.
  const centerShift = rotatePoint(
    { x: (realDw / 2) * dir.x, y: (realDh / 2) * dir.y },
    start.rotation,
  );
  const c = center(start);
  const nc = { x: c.x + centerShift.x, y: c.y + centerShift.y };

  return {
    x: nc.x - w / 2,
    y: nc.y - hgt / 2,
    w,
    h: hgt,
    rotation: start.rotation,
  };
}

export function rotateRect(
  start: Rect,
  pivotScreen: Point,
  startPointer: Point,
  pointer: Point,
  snapDeg?: number,
): Rect {
  const a0 = Math.atan2(
    startPointer.y - pivotScreen.y,
    startPointer.x - pivotScreen.x,
  );
  const a1 = Math.atan2(pointer.y - pivotScreen.y, pointer.x - pivotScreen.x);
  let rotation = start.rotation + (a1 - a0) / DEG;

  if (snapDeg) {
    rotation = Math.round(rotation / snapDeg) * snapDeg;
  }
  rotation = ((rotation % 360) + 360) % 360;

  return { ...start, rotation };
}

/** Normalise to (-180, 180] for display. */
export const signedAngle = (deg: number): number => {
  const a = ((deg % 360) + 360) % 360;

  return a > 180 ? a - 360 : a;
};

export interface SnapGuide {
  axis: 'x' | 'y';
  /** Design-unit position of the guide line. */
  at: number;
}

export interface DistanceHint {
  /** Design-unit distance to the left / right canvas edge. */
  left: number;
  right: number;
  centred: boolean;
}

export interface SnapResult {
  rect: Rect;
  guides: SnapGuide[];
  hint: DistanceHint;
}

/**
 * Snap a moving unrotated rect's edges/centre to the canvas edges/centre and
 * to the edges/centres of `others`. `threshold` is in design units. Rotated
 * rects only get the distance hint.
 */
export function snapRect(
  rect: Rect,
  canvas: { width: number; height: number },
  others: Rect[],
  threshold: number,
): SnapResult {
  const hintFor = (r: Rect): DistanceHint => {
    const left = r.x;
    const right = canvas.width - r.x - r.w;

    return { left, right, centred: Math.abs(left - right) < 1 };
  };

  if (rect.rotation !== 0) return { rect, guides: [], hint: hintFor(rect) };

  const xTargets = [0, canvas.width / 2, canvas.width];
  const yTargets = [0, canvas.height / 2, canvas.height];

  others.forEach((o) => {
    if (o.rotation !== 0) return;
    xTargets.push(o.x, o.x + o.w / 2, o.x + o.w);
    yTargets.push(o.y, o.y + o.h / 2, o.y + o.h);
  });

  const xEdges = [rect.x, rect.x + rect.w / 2, rect.x + rect.w];
  const yEdges = [rect.y, rect.y + rect.h / 2, rect.y + rect.h];

  const best = (edges: number[], targets: number[]) => {
    let bestDelta = Infinity;
    let bestAt: number | null = null;

    edges.forEach((e) => {
      targets.forEach((t) => {
        const d = t - e;

        if (Math.abs(d) <= threshold && Math.abs(d) < Math.abs(bestDelta)) {
          bestDelta = d;
          bestAt = t;
        }
      });
    });

    return bestAt === null ? null : { delta: bestDelta, at: bestAt };
  };

  const sx = best(xEdges, xTargets);
  const sy = best(yEdges, yTargets);
  const guides: SnapGuide[] = [];
  const out = { ...rect };

  if (sx) {
    out.x += sx.delta;
    guides.push({ axis: 'x', at: sx.at });
  }
  if (sy) {
    out.y += sy.delta;
    guides.push({ axis: 'y', at: sy.at });
  }

  return { rect: out, guides, hint: hintFor(out) };
}

/** Axis-aligned bounding box of a rotated rect (for hit areas / fit). */
export function boundingBox(r: Rect): Omit<Rect, 'rotation'> {
  const c = center(r);
  const corners = [
    { x: -r.w / 2, y: -r.h / 2 },
    { x: r.w / 2, y: -r.h / 2 },
    { x: r.w / 2, y: r.h / 2 },
    { x: -r.w / 2, y: r.h / 2 },
  ].map((p) => rotatePoint(p, r.rotation));
  const xs = corners.map((p) => p.x + c.x);
  const ys = corners.map((p) => p.y + c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    w: Math.max(...xs) - minX,
    h: Math.max(...ys) - minY,
  };
}

export const roundRect = (r: Rect, digits = 0): Rect => {
  const f = 10 ** digits;
  const rd = (n: number) => Math.round(n * f) / f;

  return {
    x: rd(r.x),
    y: rd(r.y),
    w: rd(r.w),
    h: rd(r.h),
    rotation: Math.round(r.rotation * 10) / 10,
  };
};

/** Union of several rects' bounding boxes (multi-selection outline). */
export function unionBox(rects: Rect[]): Omit<Rect, 'rotation'> | null {
  if (!rects.length) return null;
  const boxes = rects.map(boundingBox);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x + b.w));
  const y2 = Math.max(...boxes.map((b) => b.y + b.h));

  return { x, y, w: x2 - x, h: y2 - y };
}
