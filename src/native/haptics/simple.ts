import type { HapticCue, HapticCueId } from './cues';
import type {
  HapticFallbackKind,
  HapticPattern,
  HapticPriority,
} from './types';

/**
 * Simple mode (docs/haptics.md §2): phones whose motor can't play shaped
 * haptics (Android without composition primitives, or no DouzeHaptics
 * plugin) get at most one of the device's own effects per moment. The busy
 * moments (rows moving, page turns, slots passed, heartbeats, the hearts)
 * play nothing: on a basic motor they add up to a constant buzz.
 */
export type SimpleHapticEffect = 'tick' | 'click' | 'heavy' | 'double';

export interface SimpleHaptic {
  effect: SimpleHapticEffect;
  /** When it plays, in ms from the moment (a landing after a flight). */
  at?: number;
}

type SimpleMap = {
  [K in HapticCueId]: (
    cue: Extract<HapticCue, { id: K }>,
  ) => SimpleHaptic | null;
};

const tick = (): SimpleHaptic => ({ effect: 'tick' });
const click = (): SimpleHaptic => ({ effect: 'click' });
const heavy = (): SimpleHaptic => ({ effect: 'heavy' });
const double = (): SimpleHaptic => ({ effect: 'double' });
const none = () => null;

const SIMPLE: SimpleMap = {
  // Jury voting: a tick per award, the 12 is the one strong knock.
  points: tick,
  pointsFlurry: (cue) => (cue.endsWithDouze ? heavy() : click()),
  douzeHit: heavy,
  douzeBloom: none,
  climb: none,
  nextJury: none,
  scaleStep: tick,
  spokespersonDouze: heavy,
  votingRush: heavy,
  undo: tick,
  // Televote.
  televote: click,
  nulPoints: click,
  // Qualifiers.
  qualifierCards: none,
  qualifierLockIn: heavy,
  nonQualifiers: none,
  // Final reveal: only the outcome.
  revealBeat: none,
  revealCross: heavy,
  revealFall: click,
  revealHold: none,
  revealWinnerFlash: none,
  // Winner.
  winnerFireworks: double,
  winnerReveal: click,
  winnerScore: none,
  // Setup.
  dragLift: click,
  dragOver: none,
  dragSlot: none,
  dragBoundary: tick,
  dragDrop: tick,
  dragCancel: none,
  shuffle: click,
  sortSweep: tick,
  curtainUp: () => ({ effect: 'click', at: 600 }),
  // Allocation draw: one knock as each country lands.
  drawPot: none,
  drawPick: none,
  drawChip: none,
  drawFlight: (cue) => ({ effect: 'click', at: Math.max(0, cue.durationMs) }),
  drawDone: double,
  // Controls.
  selection: tick,
  sliderTick: (cue) => (cue.edge ? tick() : null),
  toggle: tick,
  snap: tick,
  // Results.
  success: double,
  warning: heavy,
  error: heavy,
};

export function simpleHapticFor(cue: HapticCue): SimpleHaptic | null {
  return (SIMPLE[cue.id] as (cue: HapticCue) => SimpleHaptic | null)(cue);
}

const FALLBACK_KIND: Record<SimpleHapticEffect, HapticFallbackKind> = {
  tick: 'light',
  click: 'medium',
  heavy: 'heavy',
  double: 'success',
};

/**
 * The one-event pattern for a simple haptic. The Android plugin plays
 * `tick` as the device's tick, `click` at 0.5 as its click, at 1 as its
 * heavy click, `doubleClick` as its double click.
 */
export function simpleHapticPattern(
  haptic: SimpleHaptic,
  priority: HapticPriority,
): HapticPattern {
  const at = haptic.at ?? 0;
  const event = {
    tick: { intensity: 0.5, sharpness: 0.9, android: 'tick' },
    click: { intensity: 0.5, sharpness: 0.7, android: 'click' },
    heavy: { intensity: 1, sharpness: 0.6, android: 'click' },
    double: { intensity: 0.8, sharpness: 0.8, android: 'doubleClick' },
  }[haptic.effect] as {
    intensity: number;
    sharpness: number;
    android: 'tick' | 'click' | 'doubleClick';
  };

  return {
    priority,
    holdMs: at + 60,
    events: [{ type: 'tap', at, ...event }],
    fallback: [{ at, kind: FALLBACK_KIND[haptic.effect] }],
  };
}
