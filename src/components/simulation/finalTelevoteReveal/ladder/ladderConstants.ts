/**
 * Every number of the ladder style, measured frame by frame from the ESC Asia
 * 2026 broadcast (docs/final-reveal-ladder-spec.md, stills in
 * docs/intro.webp and docs/reveal.webp).
 *
 * Sizes are in reference units `u`: 1 u = 1 px of the 1198 × 1292 reference
 * frame. The panel turns them into px through the `--u` CSS variable.
 * Durations are in seconds (GSAP's unit).
 */

// ── Geometry (u) ────────────────────────────────────────────────────────────

/** Track width; fully rounded on rounded themes. */
export const TRACK_W = 100;
/** Track above place 1's centre, and below the last place's centre. */
export const TRACK_TOP_PAD = 73;
export const TRACK_BOTTOM_PAD = 65;
/** The reference distance between two places. */
export const PITCH_REF = 67.3;
/** Rank chip behind every numeral, and the ring drawn around an occupied one. */
export const CHIP_W = 76;
export const CHIP_H = 44;
export const RING_W = 84;
export const RING_H = 52;
export const RING_STROKE = 4;

export const PILL_H = 84;
export const CAP_W = 120;
/** The cap starts as a dot: a circle this wide, 12 u nearer the ladder. */
export const DOT_W = 84;
export const DOT_SHIFT = 12;
export const FLAG_W = 127;
export const NAME_PAD_X = 34;
export const NAME_FONT = 32;
export const POINTS_FONT = 48;
/** The cap's inner end sits this far from the track's edge. */
export const PILL_GAP = 15;
export const CONNECTOR_H = 5;
/**
 * The pill body (name + flag) hides behind the dot before it unfurls: the
 * dot's outer edge is this much nearer the ladder than the cap's.
 */
export const BODY_TUCK = CAP_W - DOT_W + DOT_SHIFT; // 48

export const TAG_H = 53;
export const TAG_GAP = 10;
/** The tag's mask: the tag rises out of the pill's top edge. */
export const TAG_MASK_H = TAG_H + TAG_GAP; // 63
export const TAG_FONT = 24;
export const TAG_PAD_X = 30;
/** Tags line up with the pill's ladder-side end, 3 u inside it. */
export const TAG_INSET = 3;

/** Room above place 1 for the tag over the pill. */
export const TOP_HEADROOM = PILL_H / 2 + TAG_MASK_H - TRACK_TOP_PAD + 6; // 38

/**
 * Corner rounding on themes with square rows, as a share of a full pill
 * (1 on rounded themes): softly rounded rather than sharp.
 */
export const ROUND_SQUARE_THEMES = 0.35;

// ── Fit ─────────────────────────────────────────────────────────────────────

/** `u` stays between these shares of the panel's height. */
export const U_PER_HEIGHT_MAX = 1 / 1000;
export const U_PER_HEIGHT_MIN = 1 / 1150;
/** Below this pill height (screen px) names give way to 3-letter codes. */
export const MIN_PILL_PX = 36;
/** Panel height (the board's own px) on desktop, before the board's zoom. */
export const DESKTOP_PANEL_H = 600;
export const MIN_PANEL_H = 320;
export const MAX_PHONE_PANEL_H = 900;
/** Side flags only when each side has at least this much room (u). */
export const MIN_SIDE_FLAG_W = 120;

// ── Intro (§4.2) ────────────────────────────────────────────────────────────

export const INTRO = {
  trackIn: 0,
  numeralsIn: 0.12,
  /** Per numeral; squeezed so long ladders finish by `numeralsEnd`. */
  numeralStagger: 0.045,
  numeralsEnd: 0.8,
  leaderRing: 0.85,
  leaderDot: 0.883,
  /** Last country's ring, dot, expansion, points and tag follow this late. */
  lastOffset: 0.316,
  leaderExpand: 1.316,
  lastExpand: 1.6,
  leaderPoints: 1.75,
  lastPoints: 2.05,
  leaderTag: 2.433,
  lastTag: 2.566,
  done: 2.9,
} as const;

// ── Reveal pacing ───────────────────────────────────────────────────────────
// The climb itself is the Bar style's result-blind path (`revealPath.ts`).

/** After the last points arrive: the column folds and the panel re-fits. */
export const SETTLE_S = 0.9;
/**
 * The heartbeat starts when the climb is this far to the mark and is at full
 * speed and strength at the mark. It follows the climb, not the result.
 */
export const HEARTBEAT_FROM = 0.75;

/** Places shown below the last country's starting place (it only climbs). */
export const PLACES_BELOW_LAST = 2;

// ── Micro-animations (§7, absolute: the speed setting doesn't touch them) ──

export const MOVE_S = 0.24;
export const SWAP_S = 0.49;
export const RING_HIDE_S = 0.06;
export const RING_POP_DELAY_S = 0.17;
export const RING_POP_S = 0.26;
export const TAG_RISE_S = 0.33;
export const WINNER_TAG_RISE_S = 0.27;
export const TAG_SINK_S = 0.17;
export const LEADER_TAG_FADE_S = 0.15;

/** Motion blur on the sliding pills (desktop website only). */
export const ENABLE_MOTION_BLUR = true;
