/**
 * The platform-neutral haptic pattern format (docs/haptics.md). Cues are
 * written once in these terms and rendered per platform: Core Haptics events
 * on iOS, `VibrationEffect.Composition` primitives on Android, and a few
 * `@capacitor/haptics` presets where the app's own plugin is missing.
 */

/** The Android composition primitives the DouzeHaptics plugin knows. */
export type AndroidPrimitive =
  | 'click'
  | 'tick'
  | 'lowTick'
  | 'thud'
  | 'spin'
  | 'quickRise'
  | 'slowRise'
  | 'quickFall'
  /** Not a composition primitive: the device's predefined double click (simple mode). */
  | 'doubleClick';

/** How a hum's intensity moves over its duration. */
export type HapticShape = 'flat' | 'rise' | 'fall' | 'swell';

interface HapticEventBase {
  /** Start, in ms from the start of the cue. */
  at: number;
  /** 0–1, before the strength setting scales it. */
  intensity: number;
  /** 0 (round, dull) to 1 (crisp, clicky). */
  sharpness: number;
  /** A hand-picked Android primitive instead of the derived one. */
  android?: AndroidPrimitive;
  /** Leaves the event out on the other platform. */
  only?: 'ios' | 'android';
}

/** A single knock: a Core Haptics transient, an Android click or thud. */
export interface HapticTap extends HapticEventBase {
  type: 'tap';
}

/** A sustained vibration: a Core Haptics continuous event, an Android rise/fall/rumble. */
export interface HapticHum extends HapticEventBase {
  type: 'hum';
  duration: number;
  shape?: HapticShape;
}

export type HapticEvent = HapticTap | HapticHum;

/**
 * 0 = ticks (every vote), 1 = moments, 2 = big moments (douze, outcomes),
 * 3 = the finale. A cue can't cut into a stronger one while it is held.
 */
export type HapticPriority = 0 | 1 | 2 | 3;

export type HapticFallbackKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

export interface HapticFallbackStep {
  at: number;
  kind: HapticFallbackKind;
}

export interface HapticPattern {
  priority: HapticPriority;
  events: HapticEvent[];
  /**
   * How long weaker cues are kept out, in ms from the start. Defaults to the
   * whole pattern; shorter when only the start matters (a fading tail may be
   * cut by the next tap).
   */
  holdMs?: number;
  /** Replaces the derived `@capacitor/haptics` fallback. */
  fallback?: HapticFallbackStep[];
}

/** One Core Haptics event as the iOS plugin reads it (times in seconds). */
export interface IosHapticEvent {
  /** `t` transient, `c` continuous. */
  k: 't' | 'c';
  time: number;
  dur?: number;
  i: number;
  s: number;
}

/** One composition primitive as the Android plugin reads it. */
export interface AndroidHapticStep {
  p: AndroidPrimitive;
  /** Scale, 0–1. */
  s: number;
  /** Absolute start in ms; the plugin turns it into composition delays. */
  at: number;
}
