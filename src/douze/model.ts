/**
 * Douze points animations as data (docs/theme-animations-and-specifics.md §10).
 *
 * A spec is a list of layers placed against the parts of a country row (the
 * row itself, its flag, name, last-points box and total). Every layer has
 * keyframes on one shared clock, so `DouzeSpecPlayer` can play the whole
 * animation or hold it at any moment (the dev lab at /dev/douze-lab).
 * Built-in specs live in `specs/`. A custom theme changes one through its
 * options (options.ts: colours, speed, parts, strength).
 */

/** Row parts a layer can be placed against: `data-douze-anchor` values. */
export type DouzeAnchor = 'row' | 'flag' | 'name' | 'lastPoints' | 'total';

/**
 * A layer's box. `x`/`y`/`w`/`h` are shares of the anchor's box (they may go
 * past 0..1). The `…Rh` fields add lengths in row heights, for parts sized by
 * the row's height rather than its width (a bar's width, a ring's diameter).
 * `w`/`h` default to 1 unless the matching `…Rh` is given.
 */
export interface DouzeBox {
  anchor: DouzeAnchor;
  /** Anchor for `y`/`h` when it differs (a glow centred on the flag's edge but sized by the row). */
  anchorY?: DouzeAnchor;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  xRh?: number;
  yRh?: number;
  wRh?: number;
  hRh?: number;
}

/**
 * A horizontal move: a share of the row's width, or a placement against a
 * part: the layer's `align` edge on the part's `at` edge, plus `offset` row
 * widths (the 2022 box starts just past the row's right edge; the beam's tip
 * meets the 12 box). Placements resolve to distances first, so a track can
 * mix them with plain numbers and still interpolate.
 */
export type DouzeX =
  | number
  | {
      on: DouzeAnchor;
      at?: 'left' | 'centre' | 'right';
      align?: 'left' | 'centre' | 'right';
      offset?: number;
    };

export interface DouzeKeyframe {
  /** ms from the start of the animation. */
  t: number;
  opacity?: number;
  /** Horizontal move in row widths, or a placement against a part. */
  x?: DouzeX;
  /** Vertical move in row heights. */
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  /** Degrees. */
  rotate?: number;
  /** Share of the layer shown, growing from `revealFrom` (a clip). */
  reveal?: number;
  /**
   * With `clipTo`: shares of the clip box hidden from its left / right. Unlike
   * `reveal` the window stays put while the layer moves through it (the 2022
   * waves flow right under an edge that sweeps after them).
   */
  windowLeft?: number;
  windowRight?: number;
  /**
   * Canvas painters only: where the waves pinch, a position in the row
   * (row widths from its left edge, or a placement against a part).
   */
  pinch?: DouzeX;
  /** CSS easing from this keyframe to the next one. Default linear. */
  ease?: string;
}

/** Generated SVG parts; colours are CSS colours or `var(--douze-c1)`. */
export type DouzeEffect =
  /** A vertical strip with torn, glitchy edges. */
  | { type: 'tornBar'; color: string; seed: number }
  /** A thin curved line, ")" when `bend` > 0, with a soft glow. */
  | { type: 'arc'; color: string; bend: number; width: number }
  /** A circle outline with a soft glow, centred in the box. */
  | { type: 'ring'; color: string; width: number }
  /** A four-point lens flare. */
  | { type: 'star'; color: string }
  /** Thin vertical light rays above and below the middle `gap` of the box. */
  | { type: 'rays'; color: string; count: number; gap: number; seed: number }
  /**
   * A train of thin waves pinching at evenly spaced nodes (a standing wave,
   * the 2022 cymatics look), two families so they cross into a diamond mesh.
   * Long enough to flow through the row under a moving window.
   */
  | {
      type: 'strands';
      colors: string[];
      /** Lines per family. */
      count: number;
      /** Distance between nodes, in box heights (keeps the diamonds' shape at any width). */
      spacing: number;
      seed: number;
      /** Share of the width over which the train opens from a point (0: open from the start). */
      pinch?: number;
      /** Soft blurred copy under the lines. */
      glow?: boolean;
    }
  /** A spear of light: a rounded wide end on the left, pointed on the right. */
  | { type: 'beam'; core: string; edge: string }
  /** Diagonal lines crossing both ways. */
  | { type: 'crossLines'; color: string; count: number };

interface DouzeLayerBase {
  id: string;
  box: DouzeBox;
  keyframes: DouzeKeyframe[];
  blend?: 'normal' | 'screen' | 'plus-lighter' | 'overlay' | 'soft-light';
  /** transform-origin in CSS syntax; default the box's centre. */
  origin?: string;
  /** Where `reveal` grows from. Default left. */
  revealFrom?: 'left' | 'right';
  /**
   * Clipped to this part's box, in its shape (corner radii included: on a
   * rounded theme the row is a pill). Broadcast graphics stay inside the row.
   */
  clipTo?: DouzeAnchor;
  /**
   * A static CSS filter, applied once (only opacity and transform animate):
   * `brightness(0) invert(1)` turns a copied part into a white silhouette of
   * its own shape.
   */
  filter?: string;
  /**
   * With `clipTo`: row parts drawn over the copied part in the row (the
   * total's curved edge over the 12 box). Their shapes are cut out of the
   * layer, so a copy keeps the shape the row shows.
   */
  cutBy?: DouzeAnchor[];
  /** Left out on low-performance and reduced-motion devices. */
  heavy?: boolean;
  /**
   * The part of the animation the layer belongs to (one of the spec's
   * `parts`), which a custom theme can switch off. Layers without one
   * always play (the 2022 box slide takes over the real 12 box).
   */
  group?: string;
  /** Which strength option scales this layer's opacity (options.ts). */
  intensity?: 'glow' | 'wash';
}

export interface DouzeRectLayer extends DouzeLayerBase {
  kind: 'rect';
  /** CSS background. */
  fill: string;
  /** CSS border-radius, or `anchor` for the anchor's own (the halo on a pill row). */
  radius?: string;
  /** CSS box-shadow (drawn once; only opacity animates). */
  shadow?: string;
}

export interface DouzeEffectLayer extends DouzeLayerBase {
  kind: 'effect';
  effect: DouzeEffect;
}

/**
 * A copy of one of the row's parts, taken when the animation starts.
 * `hideSource` hides the real part until the animation ends, so the copy can
 * move it (the 2022 12 box slides in from the total). `glitch` tears it with
 * an SVG displacement filter.
 */
export interface DouzeCloneLayer extends DouzeLayerBase {
  kind: 'clone';
  source: Exclude<DouzeAnchor, 'row'>;
  hideSource?: boolean;
  glitch?: { seed: number; scale: number; frequency?: string };
}

/**
 * Effects drawn per frame on a canvas from the animation's clock, because
 * their shape changes over time (see painters.ts). Lengths are in row
 * heights (`…` of the band's shape) or row widths (positions and speeds).
 */
export type DouzePainter = {
  /** The 2022 mesh: waves flowing right through a moving pinch. */
  type: 'waveFlow';
  /** Stroke colours, cycled line by line (CSS colours or `var(--douze-…)`). */
  colors: string[];
  /** Lines per family (two families, the second fainter and longer). */
  lines: number;
  /** Wave length, in row heights. */
  wavelength: number;
  /** Amplitude, in row heights (above 0.5 the row clips the turns). */
  amplitude: number;
  /** Flow speed, in row widths a second. */
  speed: number;
  /** Width of the pinch (the waves pass through it as one line), in row widths. */
  pinchWidth: number;
  /** Distance over which the waves open from the pinch, in row widths. */
  pinchRadius: number;
  /** In px. */
  lineWidth: number;
  /** Fade at the window's edges, in row widths. */
  edgeSoftness: number;
};

/**
 * A canvas the size of its box, drawn by a painter from the shared clock.
 * `windowLeft` / `windowRight` (shares of the box hidden from each side) and
 * `pinch` are read from the keyframes, linearly interpolated (their `ease`
 * is ignored); opacity and transform animate as on any layer.
 */
export interface DouzeCanvasLayer extends DouzeLayerBase {
  kind: 'canvas';
  painter: DouzePainter;
}

export type DouzeLayer =
  | DouzeRectLayer
  | DouzeEffectLayer
  | DouzeCloneLayer
  | DouzeCanvasLayer;

export interface DouzeAnimationSpec {
  id: string;
  durationMs: number;
  /**
   * `after`: the row climbs once the animation has ended (the board waits).
   * `before`: the board moves first and the animation plays at the new place.
   */
  reorder: 'after' | 'before';
  /**
   * Values for `var(--douze-<key>)` in the layers. With `paletteFrom`, `c1`,
   * `c2`, `c3` and `glow` come from the row instead, and these are the
   * fallback when it can't be read.
   */
  palette: Record<string, string>;
  /**
   * `flag`: the country's own colours, read from the row's flag
   * (flagPalette.ts). `theme`: the theme's 12 box, douze and name colours
   * (themePalette.ts). Absent: the fixed `palette`.
   */
  paletteFrom?: 'flag' | 'theme';
  /**
   * The parts a custom theme can switch off (layers' `group`), in the order
   * the theme editor lists them. Each has a label under
   * `widgets.themes.visualDetails.douzeOptions.parts`.
   */
  parts?: string[];
  layers: DouzeLayer[];
}
