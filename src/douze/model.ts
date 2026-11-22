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

/**
 * Row parts a layer can be placed against: `data-douze-anchor` values.
 * `strip` is the flag and name's background: on rounded rows (2026) a strip
 * whose round end lies over the total, on square rows the whole row, under
 * the points.
 */
export type DouzeAnchor =
  | 'row'
  | 'strip'
  | 'flag'
  | 'name'
  | 'lastPoints'
  | 'total';

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
 * widths and `offsetRh` row heights (the 2022 box starts just past the
 * row's right edge; the beam's tip meets the 12 box; the 2026 round edge
 * rests a row height past the row's end, clear of its corners on any
 * width). Placements resolve to distances first, so a track can mix them
 * with plain numbers and still interpolate.
 */
export type DouzeX =
  | number
  | {
      on: DouzeAnchor;
      at?: 'left' | 'centre' | 'right';
      align?: 'left' | 'centre' | 'right';
      offset?: number;
      offsetRh?: number;
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
   * The reveal's edge as a position in the row (row widths from its left
   * edge, or a placement against a part) instead of a share of the layer.
   * The clip spans the row's height, so layers revealed on one track keep
   * one edge, whatever their boxes (the 2026 gold and the name over it).
   * Shown left of the edge (`revealFrom` right: right of it).
   */
  revealX?: DouzeX;
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
   * With `revealX`: `round` gives the moving edge a half circle the row's
   * height across (the 2026 gold's edge, the shape of the strip's end).
   */
  revealEdge?: 'straight' | 'round';
  /**
   * Clipped to this part's box, in its shape (corner radii included: on a
   * rounded theme the row is a pill). Broadcast graphics stay inside the row.
   * A part other than the row is clipped by the row too, as the row clips
   * its content (the strip's left end is the pill's round end).
   */
  clipTo?: DouzeAnchor;
  /**
   * A static CSS filter, applied once (only opacity and transform animate):
   * `brightness(0) invert(1)` turns a copied part into a white silhouette of
   * its own shape.
   */
  filter?: string;
  /**
   * With `clipTo`: row parts that may be drawn over the copied part (or the
   * part the layer is clipped to) in the row: the total's curved edge over
   * the 12 box. Those that do draw over it (paint order, measured on the
   * row) are cut out of the layer, so a copy keeps the shape the row shows.
   * One spec fits both layouts: the total lies over the strip on square
   * rows and under it on rounded ones.
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
  /**
   * Only on rows of this layout (the row's `data-douze-layout`): rounded
   * pill rows (2026), where the strip lies over the points, or square rows,
   * where the points lie over it. The 2026 gold takes the 12 box on pill
   * rows and the total on square ones.
   */
  layout?: DouzeRowLayout;
  /**
   * A static CSS clip-path (layers with `reveal` or `revealX` animate their
   * own). The 2026 halo cuts a notch on its left, at the row's height, so
   * it doesn't lighten the 12 box's left part.
   */
  clipPath?: string;
}

export type DouzeRowLayout = 'rounded' | 'square';

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
  /**
   * Repaints the copy: `fill` its background and the fill of its SVG
   * shapes (a CSS colour), `text` the colour of all its text. The 2026 12
   * box turns gold, the name over the gold takes `--douze-ink`.
   */
  paint?: { fill?: string; text?: string };
}

/**
 * Moves one of the row's real parts, not a copy: the keyframes' transform
 * and opacity play on the part itself, so everything in it stays live (the
 * 12 box's own entrance, the total counting up, the name). The 2021 row
 * pops out of the board. Its `box` is the part's own (`{ anchor: part }`),
 * `origin` is set on the part, and the part is as it was once the
 * animation ends. Clips, cuts, filters and blends don't apply.
 */
export interface DouzePartLayer extends DouzeLayerBase {
  kind: 'part';
  part: 'row';
}

/** A thin line across a slab's bottom side (`slabLines`). */
export interface DouzeSlabLine {
  /** Where it meets the face's bottom edge, a share of the face's width. */
  at: number;
  /** px across per px down (0: upright; the side's own slant is about 1). */
  slant: number;
}

/**
 * Effects drawn per frame on a canvas from the animation's clock, because
 * their shape changes over time (see painters.ts). Lengths are in row
 * heights (`…` of the band's shape) or row widths (positions and speeds).
 */
export type DouzePainter =
  | {
      /**
       * The sides of a slab: what shows between a `part` layer's resting
       * box and where its transform puts it (`follow`, the part layer's
       * id), as if the part were a block lifted off the board. The bottom
       * side in `colors[0]`, the right side in `colors[1]` (a lift up and
       * to the left shows those two), rounded corners extruded as arcs, so
       * a pill row is a pill-shaped slab. Never over the part's face.
       */
      type: 'slabSides';
      follow: string;
      colors: string[];
    }
  | {
      /**
       * Thin lines across the bottom side of the same slab (the 2021
       * facets), in `colors[0]` turned a little lighter on a dark colour
       * and darker on a light one, as the broadcast's are.
       */
      type: 'slabLines';
      follow: string;
      colors: string[];
      lines: DouzeSlabLine[];
      /** In row heights. */
      width: number;
    }
  | DouzeWaveFlowPainter;

/** The 2022 mesh (see `DouzePainter`). */
export type DouzeWaveFlowPainter = {
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

/**
 * A line of text in its box, set in the type of one of the row's parts
 * (its face, weight, size, spacing and case), so it reads as part of the
 * row on any theme: the 2024 "12 POINTS" is set like the names. One line,
 * never wrapped: what runs past the box overflows to the side away from
 * `align`, and `clipTo` cuts it (the 2023 giant words).
 */
export interface DouzeTextLayer extends DouzeLayerBase {
  kind: 'text';
  /**
   * What it says. `points`: the points just given, in the app's language
   * ("12 points", `simulation.douzePoints`), from the player's
   * `pointsLabel`. `name`: the country's name as the row shows it (its
   * short code where the row shows one). Without it the layer isn't drawn.
   */
  text: 'points' | 'name';
  /** The row part whose type it takes. */
  font: Exclude<DouzeAnchor, 'row' | 'strip'>;
  /**
   * Font size in row heights, in place of the part's own (the 2023 words
   * two row heights tall, cut by the row).
   */
  size?: number;
  /** Where the line sits in its box. Default centre. */
  align?: 'left' | 'centre' | 'right';
  /** CSS colour. */
  color: string;
}

export type DouzeLayer =
  | DouzeRectLayer
  | DouzeEffectLayer
  | DouzeCloneLayer
  | DouzeCanvasLayer
  | DouzeTextLayer
  | DouzePartLayer;

/** Theme colours a spec can take its palette from (`themeColors`). */
export type DouzeThemeColorKey =
  | 'juryLastPointsBg'
  | 'douzePointsBg'
  | 'juryCountryText'
  | 'douzePointsText'
  | 'douzePointsBlock1';

export interface DouzeAnimationSpec {
  id: string;
  durationMs: number;
  /**
   * `after`: the row climbs once the animation has ended (the board waits).
   * `before`: the board moves first and the animation plays at the new place.
   */
  reorder: 'after' | 'before';
  /**
   * With `reorder: 'before'`, when a flipping board moves the row (ms after
   * the 12; the board's own 1000 without it): the 2021 row lifts, holds,
   * flies to its new place raised and lands there. A teleporting board
   * keeps its 1000 and plays the animation at the new place.
   */
  moveAtMs?: number;
  /**
   * Draw the row's whole item over its neighbours while the animation plays
   * (the 2021 row's face reaches over the row above, and on a flipping
   * board the raised row flies over the rows it passes).
   */
  raise?: boolean;
  /**
   * With flag or theme colours, colours darker than this (relative
   * luminance) are lifted toward white so they read on the dark board
   * (default 0.12: navy and deep blues are lifted). 2021 keeps the flags'
   * own blues and only lifts near-black.
   */
  liftBelow?: number;
  /**
   * Values for `var(--douze-<key>)` in the layers. With `paletteFrom` (or a
   * custom theme's colours), `c1`, `c2`, `c3`, `glow` (a tint of c1) and
   * `ink` (black or white, whichever reads on c1) come from there instead,
   * and these are the fallback when they can't be read.
   */
  palette: Record<string, string>;
  /**
   * `flag`: the country's own colours, read from the row's flag
   * (flagPalette.ts). `theme`: the theme's colours (themePalette.ts, see
   * `themeColors`). Absent: the fixed `palette`.
   */
  paletteFrom?: 'flag' | 'theme';
  /**
   * With flag colours, what `c3` is for a flag of two colours: the first
   * (default: the 2022 ring) or the second (2023, whose blue words sit on
   * the `c1` fill and would vanish into it).
   */
  twoColorFlagC3?: 'first' | 'second';
  /**
   * The theme colours `c1`, `c2` and `c3` come from with theme colours
   * (`--twc-countryItem-<key>`, in order). Default: the 12 box, the douze
   * colour and the name text (2022: the sweeps take the box's colour). The
   * 2026 gold is the theme's douze colour; 2023 takes the douze colour, its
   * text colour and the parallelograms' first block (the 2023 theme's
   * yellow, magenta and blue).
   */
  themeColors?: DouzeThemeColorKey[];
  /**
   * The parts a custom theme can switch off (layers' `group`), in the order
   * the theme editor lists them. Each has a label under
   * `widgets.themes.visualDetails.douzeOptions.parts`.
   */
  parts?: string[];
  layers: DouzeLayer[];
}
