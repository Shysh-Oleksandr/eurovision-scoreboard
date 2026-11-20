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
} from './anchors';
import { renderEffect } from './effects';
import { paletteFromColors, sampleFlagColors } from './flagPalette';
import type {
  DouzeAnchor,
  DouzeAnimationSpec,
  DouzeCloneLayer,
  DouzeLayer,
} from './model';
import { paint } from './painters';
import { readThemeColors } from './themePalette';
import {
  type AnchorRects,
  fillKeyframes,
  painterSampler,
  type PxRect,
  resolveBox,
  toWebKeyframes,
  toWindowKeyframes,
} from './timeline';

/** A canvas layer ready to draw any moment. */
type PainterEntry = { draw: (t: number) => void };

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
    () => spec.layers.filter((layer) => !(lite && layer.heavy)),
    [spec, lite],
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

    const anchors = measureAnchors(parent);
    const boxes = new Map<string, PxRect>();
    // Layers for another row layout get no box, so they aren't drawn.
    const layout = findAnchor(parent, 'row')?.dataset.douzeLayout;

    layers.forEach((layer) => {
      const box =
        layer.layout && layer.layout !== layout
          ? null
          : resolveBox(layer.box, anchors);

      if (box) boxes.set(layer.id, box);
    });

    // The country's own colours, read from the flag on the row (a flag
    // still loading, as lazy images do, is read again once it has loaded),
    // or the theme's, read from the row's colour variables.
    const flag =
      spec.paletteFrom === 'flag' ? findAnchor(parent, 'flag') : null;
    const loading = new AbortController();
    let colors: string[] | null = null;

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
      palette: colors
        ? { ...spec.palette, ...paletteFromColors(colors) }
        : spec.palette,
    });

    return () => loading.abort();
  }, [
    layers,
    runKey,
    spec.paletteFrom,
    spec.themeColors,
    spec.palette,
    flagLoads,
  ]);

  useLayoutEffect(() => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null;

    if (!geometry || !parent) return undefined;

    const hidden: { el: HTMLElement; visibility: string }[] = [];
    const copies: HTMLElement[] = [];
    const stopMirrors: (() => void)[] = [];
    // Latest first: two copies hiding the same part restore its own value.
    const restore = () => {
      [...hidden].reverse().forEach(({ el, visibility }) => {
        el.style.visibility = visibility;
      });
      hidden.length = 0;
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
      const node = layerNodesRef.current.get(layer.id);
      const box = geometry.boxes.get(layer.id);

      if (!node || !box) return;

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
  }, [geometry, layers, spec.durationMs]);

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

          if (!box) return null;

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
