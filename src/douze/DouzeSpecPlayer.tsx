'use client';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  buildCutMask,
  cloneRowPart,
  drawsOver,
  findAnchor,
  measureAnchorRadii,
  measureAnchors,
  mirrorText,
  paintCopy,
  resizeType,
  shownTextOf,
  typeStyleOf,
} from './anchors';
import { renderEffect } from './effects';
import { paletteFromColors, sampleFlagColors } from './flagPalette';
import type {
  DouzeAnchor,
  DouzeAnimationSpec,
  DouzeCloneLayer,
  DouzeLayer,
  DouzePartLayer,
  DouzeTextLayer,
} from './model';
import { paint, type RoundedBox, type SlabFrame } from './painters';
import { readThemeColors } from './themePalette';
import {
  type AnchorRects,
  fillKeyframes,
  painterSampler,
  type PxRect,
  resolveBox,
  resolveOrigin,
  toWebKeyframes,
  toWindowKeyframes,
  transformSampler,
} from './timeline';

/** A canvas layer ready to draw any moment. */
type PainterEntry = { draw: (t: number) => void };

/** The item is drawn over its neighbours' parts (the 2026 strip is z-21). */
const RAISED_Z_INDEX = '40';

/**
 * A computed `border-radius` as the four corners' radii in px (tl, tr, br,
 * bl; horizontal radii, percentages of the width), each at most half the
 * box's shorter side, as the browser draws them.
 */
const cornerRadii = (
  radius: string | undefined,
  w: number,
  h: number,
): RoundedBox['radii'] => {
  const values = (radius ?? '').split('/')[0].trim().split(/\s+/);
  const px = (value?: string) => {
    if (!value) return 0;

    const number = parseFloat(value);

    if (!Number.isFinite(number)) return 0;

    return Math.min(
      value.endsWith('%') ? (number / 100) * w : number,
      Math.min(w, h) / 2,
    );
  };
  const [tl, tr = tl, br = tl, bl = tr] = values;

  return [px(tl), px(tr), px(br), px(bl)];
};

/** `var(--douze-c2)` → its value on `el`; other colours pass through. */
const resolveColor = (color: string, el: Element) => {
  const match = /^var\((--[\w-]+)\)$/.exec(color.trim());

  return match
    ? getComputedStyle(el).getPropertyValue(match[1]).trim() || '#fff'
    : color;
};

type Props = {
  spec: DouzeAnimationSpec;
  /** Leave out the heavy layers (low-performance / reduced-motion devices). */
  lite?: boolean;
  /**
   * A custom entry's chosen colours (`BaseCountry.colors`): with
   * `paletteFrom: 'flag'` they're used instead of reading the row's flag.
   */
  entryColors?: readonly string[] | null;
  /**
   * The points just given, in the app's language ("12 points"), for
   * `text: 'points'` layers; without it they aren't drawn.
   */
  pointsLabel?: string;
  /** Hold the animation at this moment (ms) instead of playing it (the lab). */
  heldAtMs?: number | null;
  playbackRate?: number;
  /** Change to replay from the start. */
  runKey?: number | string;
  onComplete?: () => void;
};

type Geometry = {
  anchors: AnchorRects;
  /** Computed border-radius of each anchor. */
  radii: Partial<Record<DouzeAnchor, string>>;
  boxes: Map<string, PxRect>;
  /** Text layers' type, taken from their `font` part. */
  type: Map<string, Record<string, string>>;
  /** What text layers say (`DouzeTextLayer.text`). */
  texts: Partial<Record<DouzeTextLayer['text'], string>>;
  palette: Record<string, string>;
};

/**
 * Plays a douze spec (model.ts) over a country row. It renders an empty,
 * absolutely positioned layer at the top-left of its positioned parent and
 * finds the row's parts (`data-douze-anchor`) inside that parent, so it goes
 * next to the row, not inside it: the row's container clips its content,
 * and the light rays and halo reach past the row's edges.
 *
 * Every layer runs a Web Animation over the whole duration (one clock), so
 * `heldAtMs` holds the frame at any moment. Only transform, opacity and a
 * clip animate.
 */
const DouzeSpecPlayer: React.FC<Props> = ({
  spec,
  lite = false,
  entryColors = null,
  pointsLabel,
  heldAtMs = null,
  playbackRate = 1,
  runKey = 0,
  onComplete,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerNodesRef = useRef(new Map<string, HTMLDivElement>());
  /** `clipTo` wrappers, which carry a layer's moving window. */
  const windowNodesRef = useRef(new Map<string, HTMLDivElement>());
  const animationsRef = useRef<Animation[]>([]);
  /** The running animations on the row's real parts (`part` layers). */
  const partAnimationsRef = useRef<Animation[]>([]);
  const paintersRef = useRef<PainterEntry[]>([]);
  const onCompleteRef = useRef(onComplete);
  const heldAtRef = useRef(heldAtMs);
  const playbackRateRef = useRef(playbackRate);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  /** Bumped when the flag image finishes loading, to read its colours. */
  const [flagLoads, setFlagLoads] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const filterPrefix = `douze-glitch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  onCompleteRef.current = onComplete;
  heldAtRef.current = heldAtMs;
  playbackRateRef.current = playbackRate;

  const layers = useMemo(
    () =>
      spec.layers.filter(
        (layer) =>
          !(lite && layer.heavy) &&
          !(layer.kind === 'text' && layer.text === 'points' && !pointsLabel),
      ),
    [spec, lite, pointsLabel],
  );

  // Measure the row once per run: the animation is short, and its boxes
  // must not shift mid-way.
  useLayoutEffect(() => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null;

    setIsDone(false);
    if (!parent) {
      setGeometry(null);

      return;
    }

    // Measured at rest: a run still applied to a real part (a flag that
    // loaded mid-run measures again) would count its lift as its place.
    partAnimationsRef.current.forEach((animation) => animation.cancel());

    const anchors = measureAnchors(parent);
    const boxes = new Map<string, PxRect>();
    // Layers for another row layout get no box, so they aren't drawn.
    const layout = findAnchor(parent, 'row')?.dataset.douzeLayout;

    const type = new Map<string, Record<string, string>>();
    const nameEl = findAnchor(parent, 'name');
    const texts: Geometry['texts'] = {
      points: pointsLabel,
      name: nameEl ? shownTextOf(nameEl) : undefined,
    };

    layers.forEach((layer) => {
      // Text with nothing to say (a row without a name) isn't drawn.
      const box =
        (layer.layout && layer.layout !== layout) ||
        (layer.kind === 'text' && !texts[layer.text])
          ? null
          : resolveBox(layer.box, anchors);

      if (box) boxes.set(layer.id, box);

      const font =
        layer.kind === 'text' ? findAnchor(parent, layer.font) : null;

      if (font && layer.kind === 'text') {
        const own = typeStyleOf(font);

        type.set(
          layer.id,
          layer.size && anchors.row
            ? resizeType(own, layer.size * anchors.row.h)
            : own,
        );
      }
    });

    // The country's own colours: a custom entry's chosen ones, or read from
    // the flag on the row (a flag still loading, as lazy images do, is read
    // again once it has loaded); or the theme's, read from the row's colour
    // variables.
    const ownColors =
      spec.paletteFrom === 'flag' && entryColors?.length
        ? [...entryColors]
        : null;
    const flag =
      spec.paletteFrom === 'flag' && !ownColors
        ? findAnchor(parent, 'flag')
        : null;
    const loading = new AbortController();
    let colors: string[] | null = ownColors;

    if (flag instanceof HTMLImageElement) {
      colors = sampleFlagColors(flag);
      if (!flag.complete) {
        flag.addEventListener('load', () => setFlagLoads((n) => n + 1), {
          once: true,
          signal: loading.signal,
        });
      }
    } else if (spec.paletteFrom === 'theme') {
      colors = readThemeColors(parent, spec.themeColors);
    }

    setGeometry({
      anchors,
      radii: measureAnchorRadii(parent),
      boxes,
      type,
      texts,
      palette: colors
        ? {
            ...spec.palette,
            ...paletteFromColors(colors, {
              third: spec.twoColorFlagC3,
              lift: spec.liftBelow ?? true,
            }),
          }
        : spec.palette,
    });

    return () => loading.abort();
  }, [
    layers,
    runKey,
    pointsLabel,
    spec.paletteFrom,
    spec.themeColors,
    spec.twoColorFlagC3,
    spec.liftBelow,
    spec.palette,
    entryColors,
    flagLoads,
  ]);

  useLayoutEffect(() => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null;

    if (!geometry || !parent) return undefined;

    const hidden: { el: HTMLElement; visibility: string }[] = [];
    const copies: HTMLElement[] = [];
    const stopMirrors: (() => void)[] = [];
    /** Animations on the row's real parts (`part` layers). */
    const partAnimations: Animation[] = [];
    // The item over its neighbours while it plays (`raise`).
    const ownZIndex = parent.style.zIndex;

    if (spec.raise) parent.style.zIndex = RAISED_Z_INDEX;

    // Latest first: two copies hiding the same part restore its own value.
    const restore = () => {
      [...hidden].reverse().forEach(({ el, visibility }) => {
        el.style.visibility = visibility;
      });
      hidden.length = 0;
      // The real parts are as they were.
      partAnimations.forEach((animation) => animation.cancel());
      partAnimations.length = 0;
      if (spec.raise) parent.style.zIndex = ownZIndex;
    };

    layers.forEach((layer) => {
      if (layer.kind !== 'clone') return;

      const node = layerNodesRef.current.get(layer.id);
      const source = findAnchor(parent, layer.source);

      if (!node || !source) return;

      const copy = cloneRowPart(source);

      if (layer.paint) paintCopy(copy, layer.paint);
      node.appendChild(copy);
      copies.push(copy);
      // A total still counting up keeps counting on its copy.
      stopMirrors.push(mirrorText(source, copy));
    });

    // Cut what covers a part in the row out of its copies (the 2022
    // total's curved edge over the 12 box), measured before any part is
    // hidden. Only parts that paint over the copied (or clipping) part
    // count: the 2026 strip lies over the total on rounded rows and under
    // it on square ones. The mask goes on the static clip wrapper, so it
    // stays put while the copy moves under it.
    layers.forEach((layer) => {
      const wrapper = windowNodesRef.current.get(layer.id);

      if (!layer.cutBy || !wrapper) return;

      const reference = findAnchor(
        parent,
        layer.kind === 'clone' ? layer.source : layer.clipTo ?? 'row',
      );
      const covers = layer.cutBy
        .map((anchor) => findAnchor(parent, anchor))
        .filter(
          (el): el is HTMLElement =>
            el !== null && (!reference || drawsOver(el, reference)),
        );
      const mask = buildCutMask(wrapper, covers);

      if (!mask) return;

      wrapper.style.setProperty('mask-image', mask);
      wrapper.style.setProperty('-webkit-mask-image', mask);
      wrapper.style.setProperty('mask-repeat', 'no-repeat');
      wrapper.style.setProperty('-webkit-mask-repeat', 'no-repeat');
      wrapper.style.setProperty('mask-size', '100% 100%');
      wrapper.style.setProperty('-webkit-mask-size', '100% 100%');
    });

    layers.forEach((layer) => {
      if (
        layer.kind !== 'clone' ||
        !layer.hideSource ||
        !geometry.boxes.has(layer.id)
      ) {
        return;
      }

      const source = findAnchor(parent, layer.source);

      if (!source) return;

      hidden.push({ el: source, visibility: source.style.visibility });
      source.style.visibility = 'hidden';
    });

    const animations: Animation[] = [];

    layers.forEach((layer) => {
      if (layer.kind !== 'part') return;

      const el = findAnchor(parent, layer.part);
      const box = geometry.boxes.get(layer.id);

      if (!el || !box) return;

      const keyframes = toWebKeyframes(
        layer,
        box,
        geometry.anchors,
        spec.durationMs,
      ).map((frame) => ({
        ...frame,
        transformOrigin: layer.origin ?? '50% 50%',
      }));

      if (keyframes.length === 0) return;

      const animation = el.animate(keyframes, {
        duration: spec.durationMs,
        fill: 'both',
      });

      partAnimations.push(animation);
      animations.push(animation);
    });
    partAnimationsRef.current = partAnimations;

    layers.forEach((layer) => {
      const node = layerNodesRef.current.get(layer.id);
      const box = geometry.boxes.get(layer.id);

      if (layer.kind === 'part' || !node || !box) return;

      const keyframes = toWebKeyframes(
        layer,
        box,
        geometry.anchors,
        spec.durationMs,
      );

      if (keyframes.length === 0) return;

      animations.push(
        node.animate(keyframes, { duration: spec.durationMs, fill: 'both' }),
      );

      const windowNode = windowNodesRef.current.get(layer.id);
      const windowKeyframes = toWindowKeyframes(layer, spec.durationMs);

      if (windowNode && windowKeyframes.length > 0) {
        animations.push(
          windowNode.animate(windowKeyframes, {
            duration: spec.durationMs,
            fill: 'both',
          }),
        );
      }
    });

    animationsRef.current = animations;

    // Canvas layers draw from the same clock as the animations.
    const { row } = geometry.anchors;
    const painters: PainterEntry[] = [];

    layers.forEach((layer) => {
      if (layer.kind !== 'canvas' || !row) return;

      const canvas = layerNodesRef.current
        .get(layer.id)
        ?.querySelector('canvas');
      const box = geometry.boxes.get(layer.id);
      const ctx = canvas?.getContext('2d');

      if (!canvas || !box || !ctx) return;

      // Draw at the size it is shown: the column layout zooms the board.
      const shownWidth = canvas.getBoundingClientRect().width;
      const zoom = shownWidth > 0 && box.w > 0 ? shownWidth / box.w : 1;
      const dpr = Math.min(3, (window.devicePixelRatio || 1) * zoom);

      canvas.width = Math.max(1, Math.round(box.w * dpr));
      canvas.height = Math.max(1, Math.round(box.h * dpr));

      const sample = painterSampler(layer, geometry.anchors);
      const colors = layer.painter.colors.map((color) =>
        resolveColor(color, canvas),
      );
      const offsetX = box.x - row.x;
      const slabAt = slabSampler(layer, box, geometry, layers);

      painters.push({
        draw: (t) => {
          const tracks = sample(t);

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          paint(
            ctx,
            box.w,
            box.h,
            layer.painter,
            {
              t,
              pinchX: tracks.pinch - offsetX,
              windowLeftX: tracks.windowLeft * box.w,
              windowRightX: (1 - tracks.windowRight) * box.w,
              rowW: row.w,
              rowH: row.h,
              slab: slabAt?.(t),
            },
            colors,
          );
        },
      });
    });
    paintersRef.current = painters;

    const held = heldAtRef.current;

    animations.forEach((animation) => {
      animation.playbackRate = playbackRateRef.current;
      if (held !== null) {
        animation.pause();
        animation.currentTime = held;
      }
    });

    let cancelled = false;
    let frameRequest = 0;

    if (held !== null) {
      painters.forEach((painter) => painter.draw(held));
    } else if (painters.length > 0 && animations.length > 0) {
      const [clock] = animations;
      const tick = () => {
        if (cancelled) return;

        painters.forEach((painter) =>
          painter.draw(Number(clock.currentTime ?? 0)),
        );
        if (clock.playState === 'running') {
          frameRequest = requestAnimationFrame(tick);
        }
      };

      tick();
    }

    if (held === null && animations.length > 0) {
      animations[0].finished
        .then(() => {
          if (cancelled) return;
          restore();
          setIsDone(true);
          onCompleteRef.current?.();
        })
        .catch(() => {
          // Cancelled by the cleanup below.
        });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRequest);
      animations.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      paintersRef.current = [];
      stopMirrors.forEach((stop) => stop());
      copies.forEach((copy) => copy.remove());
      restore();
    };
    // Held/rate changes are applied by the effects below, not by a rebuild.
  }, [geometry, layers, spec.durationMs, spec.raise]);

  useEffect(() => {
    if (heldAtMs === null) return;

    animationsRef.current.forEach((animation) => {
      animation.pause();
      animation.currentTime = heldAtMs;
    });
    paintersRef.current.forEach((painter) => painter.draw(heldAtMs));
  }, [heldAtMs]);

  useEffect(() => {
    animationsRef.current.forEach((animation) => {
      animation.playbackRate = playbackRate;
    });
  }, [playbackRate]);

  const palette = geometry?.palette ?? spec.palette;
  const paletteStyle = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(palette).map(([key, value]) => [
          `--douze-${key}`,
          value,
        ]),
      ) as React.CSSProperties,
    [palette],
  );

  const glitchLayers = layers.filter(
    (layer): layer is DouzeCloneLayer =>
      layer.kind === 'clone' && !!layer.glitch,
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-douze-player=""
      className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-visible"
      style={{ ...paletteStyle, zIndex: 45 }}
    >
      {glitchLayers.length > 0 && (
        <svg width="0" height="0" className="absolute">
          <defs>
            {glitchLayers.map((layer) => (
              <filter
                key={layer.id}
                id={`${filterPrefix}-${layer.id}`}
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={layer.glitch!.frequency ?? '0.012 0.45'}
                  numOctaves={1}
                  seed={layer.glitch!.seed}
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={layer.glitch!.scale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            ))}
          </defs>
        </svg>
      )}
      {geometry &&
        !isDone &&
        layers.map((layer) => {
          const box = geometry.boxes.get(layer.id);

          // A part layer moves the row's own part: nothing to render.
          if (!box || layer.kind === 'part') return null;

          return (
            <LayerView
              key={`${layer.id}-${runKey}`}
              layer={layer}
              box={box}
              clip={layer.clipTo ? geometry.anchors[layer.clipTo] : undefined}
              clipRadius={
                layer.clipTo ? geometry.radii[layer.clipTo] : undefined
              }
              row={geometry.anchors.row}
              rowRadius={geometry.radii.row}
              anchorRadius={geometry.radii[layer.box.anchor]}
              typeStyle={geometry.type.get(layer.id)}
              text={
                layer.kind === 'text' ? geometry.texts[layer.text] : undefined
              }
              filterId={
                layer.kind === 'clone' && layer.glitch
                  ? `${filterPrefix}-${layer.id}`
                  : undefined
              }
              nodeRef={(node) => {
                if (node) layerNodesRef.current.set(layer.id, node);
                else layerNodesRef.current.delete(layer.id);
              }}
              windowRef={(node) => {
                if (node) windowNodesRef.current.set(layer.id, node);
                else windowNodesRef.current.delete(layer.id);
              }}
            />
          );
        })}
    </div>
  );
};

/**
 * For slab painters: the followed part layer's resting box and where its
 * transform puts it at any moment, in the canvas's px (the canvas is at
 * `box`). Null for other painters, or when the part isn't on the row.
 */
const slabSampler = (
  layer: DouzeLayer,
  box: PxRect,
  geometry: Geometry,
  layers: DouzeLayer[],
): ((t: number) => SlabFrame) | null => {
  if (
    layer.kind !== 'canvas' ||
    (layer.painter.type !== 'slabSides' && layer.painter.type !== 'slabLines')
  ) {
    return null;
  }

  const { follow } = layer.painter;
  const followed = layers.find(
    (other): other is DouzePartLayer =>
      other.id === follow && other.kind === 'part',
  );
  const partBox = followed && geometry.boxes.get(followed.id);

  if (!followed || !partBox) return null;

  const sample = transformSampler(followed, partBox, geometry.anchors);
  const origin = resolveOrigin(followed.origin, partBox);
  const radii = cornerRadii(
    geometry.radii[followed.part],
    partBox.w,
    partBox.h,
  );
  const back: RoundedBox = {
    x: partBox.x - box.x,
    y: partBox.y - box.y,
    w: partBox.w,
    h: partBox.h,
    radii,
  };

  return (t) => {
    const { tx, ty, sx, sy } = sample(t);
    const x = origin.x + sx * (partBox.x - origin.x) + tx;
    const y = origin.y + sy * (partBox.y - origin.y) + ty;
    const scale = Math.min(sx, sy);

    return {
      back,
      front: {
        x: x - box.x,
        y: y - box.y,
        w: partBox.w * sx,
        h: partBox.h * sy,
        radii: radii.map((r) => r * scale) as RoundedBox['radii'],
      },
    };
  };
};

const JUSTIFY = {
  left: 'flex-start',
  centre: 'center',
  right: 'flex-end',
} as const;

const LayerView: React.FC<{
  layer: DouzeLayer;
  box: PxRect;
  /** Clip box (`clipTo`), in the same coordinates as `box`. */
  clip?: PxRect;
  /** The clip part's corner radii (a pill row clips round). */
  clipRadius?: string;
  /** The row, which also clips a layer clipped to another part. */
  row?: PxRect;
  rowRadius?: string;
  /** The layer's anchor's corner radii, for `radius: 'anchor'`. */
  anchorRadius?: string;
  /** A text layer's type (its `font` part's) and words. */
  typeStyle?: Record<string, string>;
  text?: string;
  filterId?: string;
  nodeRef: (node: HTMLDivElement | null) => void;
  windowRef: (node: HTMLDivElement | null) => void;
}> = ({
  layer,
  box,
  clip,
  clipRadius,
  row,
  rowRadius,
  anchorRadius,
  typeStyle,
  text,
  filterId,
  nodeRef,
  windowRef,
}) => {
  const markup = useMemo(
    () =>
      layer.kind === 'effect' ? renderEffect(layer.effect, box.w, box.h) : '',
    [layer, box.w, box.h],
  );
  // The first frame's opacity, so nothing flashes before the animation
  // attaches (it does in the same layout pass; this is a fallback).
  const initialOpacity = useMemo(
    () => fillKeyframes(layer.keyframes)[0]?.opacity ?? 1,
    [layer.keyframes],
  );

  const style: React.CSSProperties = {
    position: 'absolute',
    left: box.x - (clip?.x ?? 0),
    top: box.y - (clip?.y ?? 0),
    width: box.w,
    height: box.h,
    opacity: initialOpacity,
    mixBlendMode: layer.blend ?? 'normal',
    transformOrigin: layer.origin,
    clipPath: layer.clipPath,
    willChange: 'transform, opacity',
  };

  if (layer.kind === 'rect') {
    style.background = layer.fill;
    style.borderRadius =
      layer.radius === 'anchor' ? anchorRadius : layer.radius;
    style.boxShadow = layer.shadow;
  }

  const filters = [filterId && `url(#${filterId})`, layer.filter].filter(
    Boolean,
  );

  if (filters.length > 0) style.filter = filters.join(' ');

  let view: React.ReactNode;

  if (layer.kind === 'effect') {
    view = (
      <div
        ref={nodeRef}
        data-douze-layer={layer.id}
        style={style}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  } else if (layer.kind === 'canvas') {
    view = (
      <div ref={nodeRef} data-douze-layer={layer.id} style={style}>
        <canvas style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
    );
  } else if (layer.kind === 'text') {
    // One line in the box; what runs past it overflows away from its
    // alignment, and the row clips it.
    view = (
      <div
        ref={nodeRef}
        data-douze-layer={layer.id}
        style={{
          ...style,
          ...typeStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: JUSTIFY[layer.align ?? 'centre'],
          whiteSpace: 'nowrap',
          lineHeight: 1,
          color: layer.color,
        }}
      >
        {text}
      </div>
    );
  } else {
    view = <div ref={nodeRef} data-douze-layer={layer.id} style={style} />;
  }

  if (!clip) return view;

  // The row clips its content, so a part other than the row shows only
  // inside the row's shape too (the strip's left end is the pill's).
  const outer = row && clip !== row ? row : null;

  // overflow: hidden makes no stacking context, so blend modes still reach
  // the row below.
  const clipped = (
    <div
      ref={windowRef}
      style={{
        position: 'absolute',
        left: clip.x - (outer?.x ?? 0),
        top: clip.y - (outer?.y ?? 0),
        width: clip.w,
        height: clip.h,
        overflow: 'hidden',
        borderRadius: clipRadius,
      }}
    >
      {view}
    </div>
  );

  if (!outer) return clipped;

  return (
    <div
      style={{
        position: 'absolute',
        left: outer.x,
        top: outer.y,
        width: outer.w,
        height: outer.h,
        overflow: 'hidden',
        borderRadius: rowRadius,
      }}
    >
      {clipped}
    </div>
  );
};

export default DouzeSpecPlayer;
