import type {
  DouzeAnchor,
  DouzeBox,
  DouzeKeyframe,
  DouzeLayer,
  DouzeX,
} from './model';

/** A box in px, relative to the player's positioned parent. */
export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AnchorRects = Partial<Record<DouzeAnchor, PxRect>>;

/** The layer's box in px, or null when its anchor isn't on this row. */
export const resolveBox = (
  box: DouzeBox,
  anchors: AnchorRects,
): PxRect | null => {
  const anchor = anchors[box.anchor];
  const anchorY = anchors[box.anchorY ?? box.anchor];
  const { row } = anchors;

  if (!anchor || !anchorY || !row) return null;

  const rh = row.h;
  const w =
    (box.w ?? (box.wRh !== undefined ? 0 : 1)) * anchor.w + (box.wRh ?? 0) * rh;
  const h =
    (box.h ?? (box.hRh !== undefined ? 0 : 1)) * anchorY.h +
    (box.hRh ?? 0) * rh;

  return {
    x: anchor.x + (box.x ?? 0) * anchor.w + (box.xRh ?? 0) * rh,
    y: anchorY.y + (box.y ?? 0) * anchorY.h + (box.yRh ?? 0) * rh,
    w: Math.max(0, w),
    h: Math.max(0, h),
  };
};

type AnimatedProp = Exclude<keyof DouzeKeyframe, 't' | 'ease'>;

const ANIMATED_PROPS: AnimatedProp[] = [
  'opacity',
  'x',
  'y',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'reveal',
  'revealX',
  'windowLeft',
  'windowRight',
  'pinch',
];

const DEFAULTS: Required<Pick<DouzeKeyframe, AnimatedProp>> = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  reveal: 1,
  revealX: 0,
  windowLeft: 0,
  windowRight: 0,
  pinch: 0,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type FilledKeyframe = Required<Pick<DouzeKeyframe, AnimatedProp | 't'>> & {
  ease?: string;
};

/**
 * Every keyframe with every property filled in. Each property is its own
 * track: a keyframe that leaves it out gets the value interpolated (in time)
 * between the nearest keyframes that set it; before the first and after the
 * last it holds. Values that aren't numbers (`{ centreOn }`) hold from the
 * previous one.
 */
export const fillKeyframes = (keyframes: DouzeKeyframe[]): FilledKeyframe[] => {
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);

  const valueAt = (prop: AnimatedProp, index: number) => {
    const own = sorted[index][prop];

    if (own !== undefined) return own;

    let before = index - 1;

    while (before >= 0 && sorted[before][prop] === undefined) before -= 1;

    let after = index + 1;

    while (after < sorted.length && sorted[after][prop] === undefined) {
      after += 1;
    }

    const previous = before >= 0 ? sorted[before][prop] : undefined;
    const next = after < sorted.length ? sorted[after][prop] : undefined;

    if (previous === undefined) return next ?? DEFAULTS[prop];
    if (
      next === undefined ||
      typeof previous !== 'number' ||
      typeof next !== 'number'
    ) {
      return previous;
    }

    const t0 = sorted[before].t;
    const t1 = sorted[after].t;
    const share = t1 === t0 ? 0 : (sorted[index].t - t0) / (t1 - t0);

    return previous + (next - previous) * share;
  };

  return sorted.map(
    (frame, index) =>
      ({
        ...Object.fromEntries(
          ANIMATED_PROPS.map((prop) => [prop, valueAt(prop, index)]),
        ),
        t: frame.t,
        ease: frame.ease,
      } as FilledKeyframe),
  );
};

const edgeOf = (rect: PxRect, edge: 'left' | 'centre' | 'right' = 'left') =>
  rect.x + (edge === 'left' ? 0 : edge === 'right' ? rect.w : rect.w / 2);

/** A move in px. */
const resolveX = (
  x: DouzeX,
  layerBox: PxRect,
  anchors: AnchorRects,
): number => {
  const rowW = anchors.row?.w ?? 0;

  if (typeof x === 'number') return x * rowW;

  const target = anchors[x.on];

  if (!target) return 0;

  return (
    edgeOf(target, x.at ?? 'left') -
    edgeOf(layerBox, x.align ?? 'left') +
    (x.offset ?? 0) * rowW +
    (x.offsetRh ?? 0) * (anchors.row?.h ?? 0)
  );
};

/** A position in the row, in px from the row's left edge. */
const resolvePosition = (x: DouzeX, anchors: AnchorRects): number => {
  const { row } = anchors;

  if (!row) return 0;
  if (typeof x === 'number') return x * row.w;

  const target = anchors[x.on];

  if (!target) return 0;

  return (
    edgeOf(target, x.at ?? 'left') -
    row.x +
    (x.offset ?? 0) * row.w +
    (x.offsetRh ?? 0) * row.h
  );
};

/** The state a canvas painter needs at time `t` (linear between keyframes). */
export interface PainterTracks {
  pinch: number;
  windowLeft: number;
  windowRight: number;
}

/**
 * Samples a canvas layer's `pinch` (px from the row's left edge) and window
 * shares at any moment; placements are resolved once, up front.
 */
export const painterSampler = (
  layer: DouzeLayer,
  anchors: AnchorRects,
): ((t: number) => PainterTracks) => {
  const rowW = anchors.row?.w || 1;
  const frames = fillKeyframes(
    layer.keyframes.map((k) =>
      k.pinch === undefined
        ? k
        : { ...k, pinch: resolvePosition(k.pinch, anchors) / rowW },
    ),
  );

  return (t) => {
    if (frames.length === 0) {
      return { pinch: 0, windowLeft: 0, windowRight: 0 };
    }

    let index = frames.findIndex((frame) => frame.t > t);

    if (index === -1) index = frames.length;

    const before = frames[Math.max(0, index - 1)];
    const after = frames[Math.min(frames.length - 1, index)];
    const share =
      after.t === before.t
        ? 0
        : Math.min(1, Math.max(0, (t - before.t) / (after.t - before.t)));
    const lerp = (a: number, b: number) => a + (b - a) * share;

    return {
      pinch: lerp(before.pinch as number, after.pinch as number) * rowW,
      windowLeft: lerp(before.windowLeft, after.windowLeft),
      windowRight: lerp(before.windowRight, after.windowRight),
    };
  };
};

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The layer's keyframes as Web Animations keyframes over the whole
 * animation (`durationMs`), so every layer shares one clock: holding the
 * animation at a moment is setting `currentTime` on each.
 */
export const toWebKeyframes = (
  layer: DouzeLayer,
  layerBox: PxRect,
  anchors: AnchorRects,
  durationMs: number,
): Keyframe[] => {
  const rowW = anchors.row?.w || 1;
  // Placements become row widths first, so the track interpolates.
  const frames = fillKeyframes(
    layer.keyframes.map((k) => {
      const resolved = { ...k };

      if (k.x !== undefined && typeof k.x !== 'number') {
        resolved.x = resolveX(k.x, layerBox, anchors) / rowW;
      }
      if (k.revealX !== undefined && typeof k.revealX !== 'number') {
        resolved.revealX = resolvePosition(k.revealX, anchors) / rowW;
      }

      return resolved;
    }),
  );

  if (frames.length === 0) return [];

  const usesRevealX = layer.keyframes.some((k) => k.revealX !== undefined);
  const usesReveal =
    !usesRevealX && layer.keyframes.some((k) => k.reveal !== undefined);
  const rowH = anchors.row?.h ?? 0;
  const revealEdgeClip = edgeClip(layer, layerBox, anchors);

  const toWeb = (
    frame: (typeof frames)[number],
    offset: number,
    easing?: string,
  ): Keyframe => {
    const tx = round((frame.x as number) * rowW);
    const ty = round(frame.y * rowH);
    const sx = frame.scale * frame.scaleX;
    const sy = frame.scale * frame.scaleY;
    const web: Keyframe = {
      offset,
      opacity: frame.opacity,
      transform: `translate(${tx}px, ${ty}px) rotate(${frame.rotate}deg) scale(${sx}, ${sy})`,
      easing: easing ?? 'linear',
    };

    if (usesReveal) {
      const hidden = round((1 - clamp01(frame.reveal)) * 100);

      web.clipPath =
        layer.revealFrom === 'right'
          ? `inset(0 0 0 ${hidden}%)`
          : `inset(0 ${hidden}% 0 0)`;
    }

    if (usesRevealX) {
      web.clipPath = revealEdgeClip((frame.revealX as number) * rowW);
    }

    return web;
  };

  return spanWholeDuration(frames, durationMs, toWeb);
};

/**
 * The clip for a `revealX` edge at `edgeX` (px from the row's left edge):
 * in the row's frame (its height, from its left or to its right end), so
 * every layer on the same track is cut along the same line whatever its
 * own box. Insets aren't clamped, so the edge interpolates in step on every
 * layer (an inset past the box hides it all).
 */
const edgeClip = (
  layer: DouzeLayer,
  box: PxRect,
  anchors: AnchorRects,
): ((edgeX: number) => string) => {
  const row = anchors.row ?? box;
  const top = round(row.y - box.y);
  const bottom = round(box.y + box.h - (row.y + row.h));
  const r = layer.revealEdge === 'round' ? round(row.h / 2) : 0;

  if (layer.revealFrom === 'right') {
    const right = round(box.x + box.w - (row.x + row.w));

    return (edgeX) =>
      `inset(${top}px ${right}px ${bottom}px ${round(
        row.x + edgeX - box.x,
      )}px round ${r}px 0 0 ${r}px)`;
  }

  const left = round(row.x - box.x);

  return (edgeX) =>
    `inset(${top}px ${round(
      box.x + box.w - (row.x + edgeX),
    )}px ${bottom}px ${left}px round 0 ${r}px ${r}px 0)`;
};

/**
 * Keyframes covering 0..1 of the duration: the first and last values are
 * held before and after the layer's own keyframes (without a frame at offset
 * 0 the browser would use the element's own style, i.e. visible).
 */
const spanWholeDuration = <F extends { t: number; ease?: string }>(
  frames: F[],
  durationMs: number,
  toWeb: (frame: F, offset: number, easing?: string) => Keyframe,
): Keyframe[] => {
  const clampOffset = (t: number) => clamp01(t / durationMs);
  const web: Keyframe[] = [];
  const [first] = frames;
  const last = frames[frames.length - 1];

  if (clampOffset(first.t) > 0) web.push(toWeb(first, 0));

  frames.forEach((frame) => {
    web.push(toWeb(frame, clampOffset(frame.t), frame.ease));
  });

  if (clampOffset(last.t) < 1) web.push(toWeb(last, 1));

  return web;
};

/**
 * The `windowLeft` / `windowRight` keyframes as a clip on the layer's
 * `clipTo` wrapper, or [] when the layer has no window.
 */
export const toWindowKeyframes = (
  layer: DouzeLayer,
  durationMs: number,
): Keyframe[] => {
  const usesWindow = layer.keyframes.some(
    (k) => k.windowLeft !== undefined || k.windowRight !== undefined,
  );

  // Canvas painters draw their own (soft-edged) window.
  if (!layer.clipTo || !usesWindow || layer.kind === 'canvas') return [];

  return spanWholeDuration(
    fillKeyframes(layer.keyframes),
    durationMs,
    (frame, offset, easing) => ({
      offset,
      clipPath: `inset(-100% ${round(
        clamp01(frame.windowRight) * 100,
      )}% -100% ${round(clamp01(frame.windowLeft) * 100)}%)`,
      easing: easing ?? 'linear',
    }),
  );
};
