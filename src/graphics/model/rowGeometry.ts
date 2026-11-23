/**
 * Where the flag and the name sit in a draw / participants row, in row
 * heights (`rh`), so the renderer and the fits agree.
 *
 * Hearts follow the official graphics on every theme: a heart about 1.36×
 * the row's height sits over the row's left end and reaches a little past
 * it. The row (a pill, or a rectangle with softened corners) is hidden
 * behind the heart there, and the dip between the lobes stays above the
 * row's top edge.
 */

export type HeartPlacement = 'overlap';

export interface RowGeometry {
  /** Where the name starts, from the row box's left edge. */
  lead: number;
  /** How far the flag reaches left of the row box. */
  overhang: number;
  /** Where the row's surface starts (under or after the heart). */
  surfaceLeft: number;
  /** The surface's top and bottom inset (a pill slimmer than the heart). */
  surfaceInset: number;
  /** The heart's square box (the heart is ~0.95 of its width). */
  heart: {
    placement: HeartPlacement;
    size: number;
    left: number;
    /** How far the heart sits above the row's centre line. */
    rise: number;
  } | null;
}

/** The official hearts are 125.33 × 131.44: width / height. */
const HEART_WIDTH = 0.96;

/** Flag + gap before the name for the theme's flag shapes. */
const THEME_FLAG_LEAD: Record<string, number> = {
  none: 0.45,
  round: 1.15,
  'round-border': 1.15,
  square: 1.3,
  'small-rectangle': 1.35,
};

export function rowGeometry(
  flagStyle: 'heart' | 'theme',
  look: { rounded: boolean; flagShape: string },
): RowGeometry {
  if (flagStyle === 'theme') {
    return {
      lead: THEME_FLAG_LEAD[look.flagShape] ?? 1.55,
      overhang: 0,
      surfaceLeft: 0,
      surfaceInset: 0,
      heart: null,
    };
  }
  // The official graphics: the heart is taller than the row and covers its
  // left end. Tall enough that the dip between the lobes clears the row's
  // top edge, so no row shows inside the heart.
  const size = 1.42;
  const left = -0.18;

  return {
    lead: left + size * HEART_WIDTH + 0.12,
    overhang: -left,
    // A square row's corners start under the heart's body, where the heart
    // is wide enough to hide them (a pill's round end hides on its own).
    surfaceLeft: look.rounded ? 0 : 0.26,
    surfaceInset: 0,
    // The heart's point hangs lower than its lobes rise: lifted a little,
    // it looks centred on the row.
    heart: { placement: 'overlap', size, left, rise: 0.1 },
  };
}
