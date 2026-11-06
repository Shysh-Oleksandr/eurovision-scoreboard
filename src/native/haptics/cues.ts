import type { HapticEvent, HapticPattern } from './types';

/**
 * The haptic cue catalog (docs/haptics.md §3): every moment the app can be
 * felt in, as a pure builder from the moment's parameters to a pattern. The
 * timings line up with the animations they accompany; the comments name the
 * constant or timeline each one follows. Tune them on a phone in the Haptics
 * lab (`/dev/haptics-lab`).
 */
export type HapticCue =
  /** Jury points below the douze tier, at the award. */
  | { id: 'points'; points: number; maxPoints: number }
  /** Several jury awards at once: grouped points or a random jury. */
  | {
      id: 'pointsFlurry';
      values: number[];
      maxPoints: number;
      endsWithDouze?: boolean;
    }
  /** The 12 lands on the row. */
  | { id: 'douzeHit' }
  /** The douze overlay appears: the hearts grid or the parallelograms. */
  | { id: 'douzeBloom'; variant: 'hearts' | 'sweep' }
  /** A row that received points moves up the board. */
  | { id: 'climb'; places: number; douze?: boolean; lead?: boolean }
  /** One country's televote points; `share` of the most it could get. */
  | { id: 'televote'; share: number }
  /** Zero televote points. */
  | { id: 'nulPoints' }
  /** "Finish randomly": everything left at once. */
  | { id: 'votingRush' }
  /** Jury scale countdown: one points value from every jury at once. */
  | { id: 'scaleStep'; recipients: number; share: number }
  /** Jury scale countdown: one spokesperson's 12. */
  | { id: 'spokespersonDouze' }
  /** The board clears for the next jury. */
  | { id: 'nextJury' }
  | { id: 'undo' }
  /** Split-screen qualifier reveal: the candidate cards slide in. */
  | { id: 'qualifierCards'; count: number }
  /** A qualifier is picked. */
  | { id: 'qualifierLockIn' }
  /** The last qualifier is in; the rest didn't make it. */
  | { id: 'nonQualifiers' }
  /** Final televote reveal: one heartbeat; `closeness` 0–1 to the mark. */
  | { id: 'revealBeat'; closeness: number }
  /** Final televote reveal: the last country crosses the mark and surges. */
  | { id: 'revealCross' }
  /** Final televote reveal: the fill stops short. */
  | { id: 'revealFall' }
  /** Final televote reveal: the leader's badge turns gold. */
  | { id: 'revealHold' }
  /** Final televote reveal: the new winner's badge turns gold. */
  | { id: 'revealWinnerFlash' }
  /** The winner is known: confetti. */
  | { id: 'winnerFireworks' }
  /** The winner modal opens. */
  | { id: 'winnerReveal' }
  /** The winner modal counts up the score over `durationMs`. */
  | { id: 'winnerScore'; durationMs: number }
  // ── Outside the simulation ──
  /** A dragged tile or row lifts (after the touch hold). */
  | { id: 'dragLift' }
  /** The dragged tile enters another drop zone (a stage, the pool, a group). */
  | { id: 'dragOver' }
  /** A dragged row passes another slot in a sorted list. */
  | { id: 'dragSlot' }
  /** A dragged row crosses the running order's halves divider. */
  | { id: 'dragBoundary' }
  /** The drag is dropped somewhere that takes it. */
  | { id: 'dragDrop' }
  /** The drag is cancelled or dropped where nothing changes. */
  | { id: 'dragCancel' }
  /** A random order: shuffle, draw halves. */
  | { id: 'shuffle' }
  /** A sorted order: A–Z, Z–A, reset. */
  | { id: 'sortSweep' }
  /** A stage starts: the board rises in. */
  | { id: 'curtainUp' }
  /** Allocation draw: a pot (group) becomes the active one. */
  | { id: 'drawPot' }
  /** Allocation draw: a country leaves its pot, landing in the spotlight after `durationMs`. */
  | { id: 'drawPick'; durationMs: number }
  /** Allocation draw: the semi-final or half chip appears. */
  | { id: 'drawChip' }
  /** Allocation draw: the flag flies to its slot and lands, over `durationMs`. */
  | { id: 'drawFlight'; durationMs: number }
  /** Allocation draw: everyone is drawn. */
  | { id: 'drawDone' }
  /** Tabs and segmented controls: another option is picked. */
  | { id: 'selection' }
  /** A slider passes a step; `edge` at its min or max. */
  | { id: 'sliderTick'; edge?: boolean }
  /** A switch or checkbox flips. */
  | { id: 'toggle'; on: boolean }
  /** Graphics studio: an element snaps to a guide, or a rotation to straight. */
  | { id: 'snap' }
  /** A success toast: saved, exported, signed in… */
  | { id: 'success' }
  /** A destructive confirmation opens, or a warning toast. */
  | { id: 'warning' }
  /** An error toast. */
  | { id: 'error' };

export type HapticCueId = HapticCue['id'];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const shift = (events: HapticEvent[], by: number): HapticEvent[] =>
  events.map((event) => ({ ...event, at: event.at + by }));

const DOUZE_HIT_EVENTS: HapticEvent[] = [
  // The crack, then the body of the hit, then a short decay.
  { type: 'tap', at: 0, intensity: 1, sharpness: 0.9, android: 'click' },
  { type: 'tap', at: 28, intensity: 0.85, sharpness: 0.2, android: 'thud' },
  {
    type: 'hum',
    at: 50,
    duration: 220,
    intensity: 0.4,
    sharpness: 0.15,
    shape: 'fall',
  },
];

/** Lub-dub, `at` the first beat. */
const heartbeat = (at: number, strength: number, gap = 170): HapticEvent[] => [
  {
    type: 'tap',
    at,
    intensity: 0.9 * strength,
    sharpness: 0.3,
    android: 'thud',
  },
  {
    type: 'tap',
    at: at + gap,
    intensity: 0.62 * strength,
    sharpness: 0.2,
    android: 'thud',
  },
];

/** Deterministic "random" pops for the fireworks: [at, intensity, sharpness]. */
const FIREWORK_POPS: [number, number, number][] = [
  [0, 0.9, 0.8],
  [140, 0.6, 1],
  [260, 1, 0.5],
  [420, 0.5, 0.9],
  [520, 0.85, 0.6],
  [700, 0.45, 1],
  [790, 0.95, 0.4],
  [980, 0.55, 0.8],
  [1100, 0.75, 0.7],
  [1290, 0.4, 1],
  [1380, 0.6, 0.5],
  [1560, 0.35, 0.9],
  [1700, 0.5, 0.6],
  [1900, 0.3, 0.8],
];

export function buildHapticPattern(cue: HapticCue): HapticPattern {
  switch (cue.id) {
    case 'points': {
      const g = clamp01(cue.points / Math.max(1, cue.maxPoints));

      return {
        priority: 0,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: 0.22 + 0.5 * g,
            sharpness: 0.45 + 0.4 * g,
          },
        ],
      };
    }

    case 'pointsFlurry': {
      const values = [...cue.values].sort((a, b) => a - b).slice(-10);
      const events: HapticEvent[] = values.map((value, index) => {
        const g = clamp01(value / Math.max(1, cue.maxPoints));

        return {
          type: 'tap',
          at: index * 45,
          intensity: 0.2 + 0.45 * g,
          sharpness: 0.5 + 0.35 * g,
        };
      });

      if (cue.endsWithDouze) {
        events.push(...shift(DOUZE_HIT_EVENTS, values.length * 45 + 40));
      }

      return { priority: cue.endsWithDouze ? 2 : 1, events };
    }

    case 'douzeHit':
      return {
        priority: 2,
        holdMs: 300,
        events: DOUZE_HIT_EVENTS,
        fallback: [
          { at: 0, kind: 'heavy' },
          { at: 110, kind: 'medium' },
        ],
      };

    case 'douzeBloom':
      if (cue.variant === 'hearts') {
        // DouzePointsAnimation's hearts grid: the name fades in at 0.3 s, the
        // columns grow over 1.6 s, the shrink phase starts at 2.3 s.
        // Held through the first heartbeat only: the next award's tap may
        // cut the rest (the user's own action wins over a tail).
        return {
          priority: 2,
          holdMs: 700,
          events: [
            ...heartbeat(120, 1),
            {
              type: 'hum',
              at: 380,
              duration: 1000,
              intensity: 0.28,
              sharpness: 0.1,
              shape: 'swell',
            },
            ...heartbeat(1500, 0.62, 160),
            {
              type: 'hum',
              at: 2300,
              duration: 650,
              intensity: 0.22,
              sharpness: 0.1,
              shape: 'fall',
            },
          ],
        };
      }

      // The parallelograms: blocks sweep across in 1 s while the overlay
      // fades in from 0.2 s (useAnimatePoints). It mounts with the award, so
      // starting at 0.2 s also leaves the douze hit alone.
      return {
        priority: 2,
        holdMs: 800,
        events: [
          {
            type: 'hum',
            at: 200,
            duration: 800,
            intensity: 0.55,
            sharpness: 0.45,
            shape: 'swell',
          },
          { type: 'tap', at: 620, intensity: 0.85, sharpness: 0.7 },
        ],
      };

    case 'climb': {
      // Fired as the row starts moving: the teleport's fade-out (0–0.4 s)
      // and fade-in at 0.56–0.6 s (useBoardAnimations), or the FLIP move.
      const places = Math.max(1, Math.round(cue.places));
      const ticks = Math.min(places, 8);
      const events: HapticEvent[] = [];

      for (let index = 0; index < ticks; index += 1) {
        events.push({
          type: 'tap',
          at: Math.round(30 + index * (380 / ticks)),
          intensity: 0.22 + 0.3 * (index / ticks) + (cue.douze ? 0.1 : 0),
          sharpness: 0.75,
          // The douze rise owns the move on Android.
          only: cue.douze ? 'ios' : undefined,
        });
      }

      if (cue.douze) {
        events.push({
          type: 'hum',
          at: 0,
          duration: 520,
          intensity: 0.5,
          sharpness: 0.35,
          shape: 'rise',
        });
      }

      if (cue.lead) {
        events.push(
          { type: 'tap', at: 600, intensity: 0.65, sharpness: 0.55 },
          { type: 'tap', at: 710, intensity: 1, sharpness: 0.85 },
        );
      } else {
        events.push({
          type: 'tap',
          at: 600,
          intensity: cue.douze ? 0.8 : 0.5,
          sharpness: 0.55,
        });
      }

      // Held for the ratchet; the next award's tap may cut the landing, so
      // a fast presentation pace never loses its taps.
      return {
        priority: cue.lead || cue.douze ? 2 : 1,
        holdMs: 450,
        events,
      };
    }

    case 'televote': {
      // Normalised so a landslide (~60% of the most possible) is the maximum.
      const s = clamp01(cue.share / 0.6);
      const duration = Math.round(100 + 800 * s);

      return {
        priority: 1,
        holdMs: 200 + 600 * s,
        events: [
          { type: 'tap', at: 0, intensity: 0.35 + 0.45 * s, sharpness: 0.55 },
          {
            type: 'hum',
            at: 30,
            duration,
            intensity: 0.2 + 0.5 * s,
            sharpness: 0.2,
            shape: s > 0.45 ? 'swell' : 'fall',
          },
        ],
      };
    }

    case 'nulPoints':
      // A falling "wah-wah".
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.6, sharpness: 0.3 },
          {
            type: 'hum',
            at: 25,
            duration: 200,
            intensity: 0.4,
            sharpness: 0.2,
            shape: 'fall',
          },
          {
            type: 'tap',
            at: 330,
            intensity: 0.45,
            sharpness: 0.15,
            android: 'thud',
          },
          {
            type: 'hum',
            at: 355,
            duration: 450,
            intensity: 0.32,
            sharpness: 0.08,
            shape: 'fall',
          },
        ],
      };

    case 'votingRush': {
      // A drumroll that speeds up, then the landing.
      const events: HapticEvent[] = [];
      let at = 0;

      for (let index = 0; index < 14; index += 1) {
        const t = index / 13;

        events.push({
          type: 'tap',
          at: Math.round(at),
          intensity: 0.25 + 0.45 * t,
          sharpness: 0.7,
        });
        at += 70 - 48 * t;
      }
      events.push(
        {
          type: 'tap',
          at: Math.round(at + 40),
          intensity: 0.95,
          sharpness: 0.45,
        },
        {
          type: 'hum',
          at: Math.round(at + 60),
          duration: 300,
          intensity: 0.35,
          sharpness: 0.2,
          shape: 'fall',
        },
      );

      return { priority: 2, events };
    }

    case 'scaleStep': {
      const count = Math.min(12, Math.max(1, Math.round(cue.recipients)));
      const intensity = 0.2 + 0.4 * clamp01(cue.share);

      return {
        priority: 1,
        events: Array.from({ length: count }, (_, index) => ({
          type: 'tap' as const,
          at: index * 32,
          intensity,
          sharpness: 0.65,
        })),
      };
    }

    case 'spokespersonDouze':
      return {
        priority: 2,
        holdMs: 700,
        events: [...DOUZE_HIT_EVENTS, ...heartbeat(320, 0.8, 160)],
        fallback: [
          { at: 0, kind: 'heavy' },
          { at: 320, kind: 'medium' },
        ],
      };

    case 'nextJury':
      // A page turn: two light flicks.
      return {
        priority: 0,
        events: [
          { type: 'tap', at: 0, intensity: 0.3, sharpness: 0.95 },
          { type: 'tap', at: 70, intensity: 0.22, sharpness: 0.7 },
        ],
      };

    case 'undo':
      // A short rewind: three ticks, each softer.
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.42, sharpness: 0.85 },
          { type: 'tap', at: 55, intensity: 0.32, sharpness: 0.75 },
          { type: 'tap', at: 110, intensity: 0.22, sharpness: 0.65 },
        ],
      };

    case 'qualifierCards': {
      // SplitScreenQualifierModal: the cards slide in from 0.1 s, 0.12 s
      // apart, over 0.5 s; each tick lands as its card arrives.
      const count = Math.min(8, Math.max(1, Math.round(cue.count)));

      return {
        priority: 1,
        events: Array.from({ length: count }, (_, index) => ({
          type: 'tap' as const,
          at: 300 + index * 120,
          intensity: 0.4,
          sharpness: 0.7,
        })),
      };
    }

    case 'qualifierLockIn':
      // Ka-chunk.
      return {
        priority: 2,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: 0.85,
            sharpness: 0.35,
            android: 'thud',
          },
          { type: 'tap', at: 70, intensity: 1, sharpness: 0.9 },
        ],
        fallback: [{ at: 0, kind: 'heavy' }],
      };

    case 'nonQualifiers':
      return {
        priority: 1,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: 0.45,
            sharpness: 0.1,
            android: 'thud',
          },
          {
            type: 'hum',
            at: 20,
            duration: 400,
            intensity: 0.3,
            sharpness: 0.05,
            shape: 'fall',
          },
        ],
      };

    case 'revealBeat': {
      const c = clamp01(cue.closeness);
      const gap = Math.round(140 - 40 * c);

      return {
        priority: 1,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: 0.3 + 0.55 * c,
            sharpness: 0.25,
            android: 'thud',
          },
          {
            type: 'tap',
            at: gap,
            intensity: 0.2 + 0.45 * c,
            sharpness: 0.15,
            android: 'thud',
          },
        ],
      };
    }

    case 'revealCross':
      // useRevealAnimation phase 2b: the bars move for 0.9 s, the fill
      // surges to 82% over 0.5 s.
      return {
        priority: 3,
        holdMs: 900,
        events: [
          { type: 'tap', at: 0, intensity: 1, sharpness: 1 },
          {
            type: 'tap',
            at: 30,
            intensity: 0.95,
            sharpness: 0.3,
            android: 'thud',
          },
          {
            type: 'hum',
            at: 90,
            duration: 560,
            intensity: 0.75,
            sharpness: 0.55,
            shape: 'rise',
          },
          { type: 'tap', at: 680, intensity: 1, sharpness: 0.75 },
        ],
        fallback: [
          { at: 0, kind: 'heavy' },
          { at: 680, kind: 'heavy' },
        ],
      };

    case 'revealFall':
      return {
        priority: 2,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: 0.45,
            sharpness: 0.12,
            android: 'thud',
          },
          {
            type: 'hum',
            at: 30,
            duration: 750,
            intensity: 0.55,
            sharpness: 0.2,
            shape: 'fall',
          },
        ],
      };

    case 'revealHold':
      return {
        priority: 2,
        events: [
          { type: 'tap', at: 0, intensity: 0.8, sharpness: 0.6 },
          { type: 'tap', at: 110, intensity: 1, sharpness: 0.9 },
        ],
        fallback: [{ at: 0, kind: 'success' }],
      };

    case 'revealWinnerFlash':
      return {
        priority: 3,
        events: [
          { type: 'tap', at: 0, intensity: 1, sharpness: 0.95 },
          {
            type: 'tap',
            at: 80,
            intensity: 0.9,
            sharpness: 0.4,
            android: 'thud',
          },
          {
            type: 'hum',
            at: 120,
            duration: 520,
            intensity: 0.45,
            sharpness: 0.3,
            shape: 'fall',
          },
        ],
        fallback: [{ at: 0, kind: 'success' }],
      };

    case 'winnerFireworks': {
      const events: HapticEvent[] = [];

      for (const [at, intensity, sharpness] of FIREWORK_POPS) {
        events.push({
          type: 'tap',
          at,
          intensity,
          sharpness,
          android: intensity >= 0.8 && sharpness < 0.6 ? 'thud' : 'click',
        });
        if (intensity >= 0.8) {
          // The crackle after a big pop.
          events.push({
            type: 'hum',
            at: at + 15,
            duration: 70,
            intensity: intensity * 0.35,
            sharpness: 0.9,
            shape: 'fall',
            only: 'ios',
          });
        }
      }
      events.push({
        type: 'hum',
        at: 1950,
        duration: 900,
        intensity: 0.25,
        sharpness: 0.3,
        shape: 'fall',
      });

      return {
        priority: 3,
        holdMs: 2000,
        events,
        fallback: [
          { at: 0, kind: 'success' },
          { at: 260, kind: 'heavy' },
          { at: 790, kind: 'medium' },
          { at: 1100, kind: 'light' },
        ],
      };
    }

    case 'winnerReveal':
      // Ta-da.
      return {
        priority: 3,
        events: [
          { type: 'tap', at: 0, intensity: 0.7, sharpness: 0.6 },
          { type: 'tap', at: 150, intensity: 1, sharpness: 0.85 },
          {
            type: 'hum',
            at: 170,
            duration: 550,
            intensity: 0.4,
            sharpness: 0.4,
            shape: 'fall',
          },
        ],
        fallback: [{ at: 0, kind: 'success' }],
      };

    case 'winnerScore': {
      // WinnerModal counts up with an ease-out cubic: a tick each time the
      // number passes another 1/22 of the score, so they slow down with it.
      const duration = Math.max(300, cue.durationMs);
      const steps = 22;
      const events: HapticEvent[] = [];

      for (let k = 1; k < steps; k += 1) {
        const progress = 1 - Math.cbrt(1 - k / steps);

        events.push({
          type: 'tap',
          at: Math.round(progress * duration),
          intensity: 0.25 + 0.2 * (k / steps),
          sharpness: 0.85,
        });
      }
      events.push(
        { type: 'tap', at: duration, intensity: 1, sharpness: 0.6 },
        {
          type: 'hum',
          at: duration + 20,
          duration: 400,
          intensity: 0.4,
          sharpness: 0.3,
          shape: 'fall',
        },
      );

      return {
        priority: 2,
        holdMs: duration + 200,
        events,
        fallback: [{ at: duration, kind: 'heavy' }],
      };
    }

    // ── Outside the simulation ──

    case 'dragLift':
      // UIKit's lift: a firm, slightly soft knock.
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.6, sharpness: 0.55 },
          {
            type: 'hum',
            at: 10,
            duration: 90,
            intensity: 0.2,
            sharpness: 0.4,
            shape: 'fall',
            only: 'ios',
          },
        ],
      };

    case 'dragOver':
      return {
        priority: 0,
        events: [{ type: 'tap', at: 0, intensity: 0.32, sharpness: 0.85 }],
      };

    case 'dragSlot':
      return {
        priority: 0,
        events: [{ type: 'tap', at: 0, intensity: 0.24, sharpness: 0.95 }],
      };

    case 'dragBoundary':
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.5, sharpness: 0.7 },
          { type: 'tap', at: 60, intensity: 0.32, sharpness: 0.9 },
        ],
      };

    case 'dragDrop':
      return {
        priority: 1,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: 0.7,
            sharpness: 0.3,
            android: 'thud',
          },
          {
            type: 'hum',
            at: 20,
            duration: 120,
            intensity: 0.25,
            sharpness: 0.2,
            shape: 'fall',
            only: 'ios',
          },
        ],
        fallback: [{ at: 0, kind: 'medium' }],
      };

    case 'dragCancel':
      return {
        priority: 1,
        events: [{ type: 'tap', at: 0, intensity: 0.28, sharpness: 0.4 }],
      };

    case 'shuffle': {
      // Dice in a cup, then they settle.
      const rattle: [number, number, number][] = [
        [0, 0.45, 0.9],
        [38, 0.3, 1],
        [70, 0.55, 0.7],
        [118, 0.35, 0.95],
        [150, 0.6, 0.8],
        [205, 0.3, 1],
        [240, 0.5, 0.75],
        [300, 0.4, 0.9],
        [345, 0.55, 0.7],
        [420, 0.3, 0.95],
      ];

      return {
        priority: 1,
        events: [
          ...rattle.map(
            ([at, intensity, sharpness]): HapticEvent => ({
              type: 'tap',
              at,
              intensity,
              sharpness,
            }),
          ),
          { type: 'tap', at: 520, intensity: 0.75, sharpness: 0.45 },
        ],
      };
    }

    case 'sortSweep':
      return {
        priority: 1,
        events: Array.from({ length: 6 }, (_, index) => ({
          type: 'tap' as const,
          at: index * 28,
          intensity: 0.2 + index * 0.06,
          sharpness: 0.9,
        })),
      };

    case 'curtainUp':
      // The board fades and rises in over 0.6 s (useBoardAnimations).
      return {
        priority: 2,
        events: [
          {
            type: 'hum',
            at: 0,
            duration: 560,
            intensity: 0.5,
            sharpness: 0.3,
            shape: 'rise',
          },
          { type: 'tap', at: 600, intensity: 0.8, sharpness: 0.6 },
        ],
        fallback: [{ at: 600, kind: 'medium' }],
      };

    case 'drawPot':
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.35, sharpness: 0.75 },
          { type: 'tap', at: 180, intensity: 0.25, sharpness: 0.7 },
        ],
      };

    case 'drawPick': {
      // The flag leaves the pot and lands in the spotlight (0.55 s in
      // useDrawCeremony at 1×; the caller divides by the draw speed).
      const duration = Math.max(80, cue.durationMs);

      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.35, sharpness: 0.85 },
          {
            type: 'hum',
            at: 20,
            duration: Math.round(duration * 0.7),
            intensity: 0.3,
            sharpness: 0.5,
            shape: 'rise',
          },
          { type: 'tap', at: duration, intensity: 0.7, sharpness: 0.6 },
        ],
      };
    }

    case 'drawChip':
      return {
        priority: 0,
        events: [{ type: 'tap', at: 0, intensity: 0.3, sharpness: 0.9 }],
      };

    case 'drawFlight': {
      // A rattle along the flight to the slot, then it lands.
      const duration = Math.max(80, cue.durationMs);

      return {
        priority: 1,
        events: [
          {
            type: 'hum',
            at: 0,
            duration: Math.round(duration * 0.85),
            intensity: 0.22,
            sharpness: 0.6,
          },
          {
            type: 'tap',
            at: duration,
            intensity: 0.85,
            sharpness: 0.45,
            android: 'thud',
          },
          {
            type: 'hum',
            at: duration + 20,
            duration: 150,
            intensity: 0.25,
            sharpness: 0.3,
            shape: 'fall',
            only: 'ios',
          },
        ],
        fallback: [{ at: duration, kind: 'medium' }],
      };
    }

    case 'drawDone':
      return {
        priority: 2,
        events: [
          { type: 'tap', at: 0, intensity: 0.6, sharpness: 0.7 },
          { type: 'tap', at: 120, intensity: 1, sharpness: 0.9 },
          {
            type: 'hum',
            at: 140,
            duration: 380,
            intensity: 0.35,
            sharpness: 0.4,
            shape: 'fall',
          },
        ],
        fallback: [{ at: 0, kind: 'success' }],
      };

    case 'selection':
      return {
        priority: 0,
        events: [{ type: 'tap', at: 0, intensity: 0.3, sharpness: 0.9 }],
        fallback: [{ at: 0, kind: 'light' }],
      };

    case 'sliderTick':
      return {
        priority: 0,
        events: [
          {
            type: 'tap',
            at: 0,
            intensity: cue.edge ? 0.45 : 0.2,
            sharpness: cue.edge ? 0.8 : 1,
          },
        ],
      };

    case 'toggle':
      // On clicks in (a knock and a catch); off is one softer knock.
      return {
        priority: 0,
        events: cue.on
          ? [
              { type: 'tap', at: 0, intensity: 0.45, sharpness: 0.75 },
              { type: 'tap', at: 45, intensity: 0.25, sharpness: 0.95 },
            ]
          : [{ type: 'tap', at: 0, intensity: 0.3, sharpness: 0.5 }],
        fallback: [{ at: 0, kind: 'light' }],
      };

    case 'snap':
      return {
        priority: 0,
        events: [{ type: 'tap', at: 0, intensity: 0.35, sharpness: 1 }],
      };

    case 'success':
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.5, sharpness: 0.6 },
          { type: 'tap', at: 110, intensity: 0.85, sharpness: 0.85 },
        ],
        fallback: [{ at: 0, kind: 'success' }],
      };

    case 'warning':
      return {
        priority: 1,
        events: [
          { type: 'tap', at: 0, intensity: 0.75, sharpness: 0.5 },
          { type: 'tap', at: 150, intensity: 0.55, sharpness: 0.45 },
        ],
        fallback: [{ at: 0, kind: 'warning' }],
      };

    case 'error':
      // Three quick dull knocks: "no, no, no".
      return {
        priority: 1,
        events: [0, 90, 180].map((at, index) => ({
          type: 'tap' as const,
          at,
          intensity: index === 2 ? 0.85 : 0.65,
          sharpness: 0.3,
          android: 'thud' as const,
        })),
        fallback: [{ at: 0, kind: 'error' }],
      };
  }
}
