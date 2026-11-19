/**
 * Turns the winner confetti settings (Settings → Effects) into react-confetti
 * options. The middle of every scale reproduces the original shower: 300
 * pieces, gravity 0.1, ten seconds of rain.
 */

export const CONFETTI_AMOUNT_RANGE = { min: 1, max: 10 } as const;
export const CONFETTI_DURATION_RANGE = { min: 5, max: 30 } as const;
export const CONFETTI_SPEED_RANGE = { min: 1, max: 10 } as const;

const PIECES_PER_STEP = 60;
const BASE_GRAVITY = 0.1;
/** react-confetti's default upward throw (px per frame). */
const BASE_THROW = 10;
/** Speed steps that double (or halve) the gravity. */
const SPEED_STEPS_PER_DOUBLING = 3.5;
/** react-confetti's default time to reach the full number of pieces. */
const MAX_RAMP_MS = 5000;

export interface ConfettiSettings {
  amount: number;
  durationSeconds: number;
  speed: number;
}

export interface ConfettiPlan {
  numberOfPieces: number;
  gravity: number;
  /** Upward throw of a new piece, scaled down with gravity on slow speeds. */
  initialVelocityY: number;
  /** Time to reach the full number of pieces. */
  tweenDuration: number;
  /** How long falling pieces are replaced before the shower ends. */
  rainMs: number;
}

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function getConfettiPlan({
  amount,
  durationSeconds,
  speed,
}: ConfettiSettings): ConfettiPlan {
  const pieces = clamp(
    amount,
    CONFETTI_AMOUNT_RANGE.min,
    CONFETTI_AMOUNT_RANGE.max,
    5,
  );
  const seconds = clamp(
    durationSeconds,
    CONFETTI_DURATION_RANGE.min,
    CONFETTI_DURATION_RANGE.max,
    10,
  );
  const fall = clamp(
    speed,
    CONFETTI_SPEED_RANGE.min,
    CONFETTI_SPEED_RANGE.max,
    5,
  );

  // Exponential, so every step feels like the same change: 0.045 … 0.27.
  const gravity = BASE_GRAVITY * 2 ** ((fall - 5) / SPEED_STEPS_PER_DOUBLING);
  const rainMs = seconds * 1000;

  return {
    numberOfPieces: Math.round(pieces * PIECES_PER_STEP),
    gravity: Math.round(gravity * 1000) / 1000,
    // With the default throw, slow pieces would fly far above the screen
    // (where react-confetti drops them) and the shower would look thin.
    initialVelocityY:
      BASE_THROW * Math.min(1, Math.sqrt(gravity / BASE_GRAVITY)),
    tweenDuration: Math.min(MAX_RAMP_MS, rainMs / 2),
    rainMs,
  };
}
