import type {
  AndroidHapticStep,
  AndroidPrimitive,
  HapticEvent,
  HapticFallbackKind,
  HapticFallbackStep,
  HapticHum,
  HapticPattern,
  HapticShape,
  IosHapticEvent,
} from './types';

/**
 * Pure renderers from the neutral pattern format to what each backend plays
 * (docs/haptics.md §2). `strength` is the user's setting, 0–1.
 */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** Below this a scaled event is imperceptible, so it is dropped. */
const MIN_INTENSITY = 0.03;

/** Shaped hums become steps this long on iOS (no shared parameter curves). */
const IOS_SEGMENT_MS = 40;

/** Spacing of the low ticks that stand in for a flat hum on Android. */
const ANDROID_RUMBLE_SPACING_MS = 45;

/** Upper bound per cue; the plugin splits long ones into several compositions. */
const ANDROID_MAX_STEPS = 48;

/**
 * Rough primitive lengths (ms). The plugin uses the device's real ones; these
 * only decide which overlapping steps to drop.
 */
const ANDROID_ESTIMATED_MS: Record<AndroidPrimitive, number> = {
  click: 12,
  tick: 8,
  lowTick: 12,
  thud: 35,
  spin: 90,
  quickRise: 120,
  slowRise: 300,
  quickFall: 90,
  doubleClick: 60,
};

const FALLBACK_MIN_GAP_MS = 70;
const FALLBACK_MAX_STEPS = 6;

/** The intensity multiplier of a shaped hum at `t` (0–1 through it). */
export function shapeLevel(shape: HapticShape, t: number): number {
  const x = clamp01(t);

  switch (shape) {
    case 'rise':
      return 0.15 + 0.85 * x;
    case 'fall':
      return 1 - 0.85 * x;
    case 'swell':
      return x < 0.6 ? 0.15 + 0.85 * (x / 0.6) : 1 - 0.85 * ((x - 0.6) / 0.4);
    default:
      return 1;
  }
}

const forPlatform = (events: HapticEvent[], platform: 'ios' | 'android') =>
  events.filter((event) => !event.only || event.only === platform);

/**
 * Moves a pattern's leading silence out of it: `offset` is when its first
 * event starts, and the returned pattern starts at 0. Sending it only at the
 * offset keeps it from cutting whatever is still playing until it has
 * something to play (Android's vibrator and an iOS interrupt both stop the
 * running cue the moment a new one is sent).
 */
export function rebasePattern(pattern: HapticPattern): {
  offset: number;
  pattern: HapticPattern;
} {
  const offset = pattern.events.reduce(
    (first, event) => Math.min(first, event.at),
    Infinity,
  );

  if (!Number.isFinite(offset) || offset <= 0) return { offset: 0, pattern };

  return {
    offset,
    pattern: {
      ...pattern,
      events: pattern.events.map((event) => ({
        ...event,
        at: event.at - offset,
      })),
      fallback: pattern.fallback?.map((step) => ({
        ...step,
        at: Math.max(0, step.at - offset),
      })),
    },
  };
}

/** Length of a pattern in ms, from its start to the end of its last event. */
export function patternDuration(pattern: HapticPattern): number {
  return pattern.events.reduce(
    (end, event) =>
      Math.max(end, event.at + (event.type === 'hum' ? event.duration : 0)),
    0,
  );
}

export function renderIos(
  pattern: HapticPattern,
  strength: number,
): IosHapticEvent[] {
  const scale = clamp01(strength);
  const out: IosHapticEvent[] = [];

  for (const event of forPlatform(pattern.events, 'ios')) {
    const intensity = clamp01(event.intensity) * scale;
    const sharpness = round3(clamp01(event.sharpness));

    if (event.type === 'tap') {
      if (intensity >= MIN_INTENSITY) {
        out.push({
          k: 't',
          time: round3(event.at / 1000),
          i: round3(intensity),
          s: sharpness,
        });
      }
      continue;
    }

    const shape = event.shape ?? 'flat';

    if (shape === 'flat') {
      if (intensity >= MIN_INTENSITY && event.duration > 0) {
        out.push({
          k: 'c',
          time: round3(event.at / 1000),
          dur: round3(event.duration / 1000),
          i: round3(intensity),
          s: sharpness,
        });
      }
      continue;
    }

    // Shaped hums are stepped rather than driven by a parameter curve: a
    // Core Haptics curve scales every event playing at the time, so it would
    // also dim the taps a cue lays over its hums.
    const segments = Math.max(2, Math.round(event.duration / IOS_SEGMENT_MS));
    const segmentMs = event.duration / segments;

    for (let index = 0; index < segments; index += 1) {
      const level = shapeLevel(shape, (index + 0.5) / segments);
      const segmentIntensity = intensity * level;

      if (segmentIntensity < MIN_INTENSITY) continue;

      out.push({
        k: 'c',
        time: round3((event.at + index * segmentMs) / 1000),
        dur: round3(segmentMs / 1000),
        i: round3(segmentIntensity),
        s: sharpness,
      });
    }
  }

  return out.sort((a, b) => a.time - b.time);
}

/** The Android primitive for a tap, unless the cue picked one. */
export function androidTapPrimitive(
  intensity: number,
  sharpness: number,
): AndroidPrimitive {
  if (sharpness < 0.35) return intensity >= 0.5 ? 'thud' : 'lowTick';

  return intensity < 0.3 ? 'tick' : 'click';
}

function androidHumSteps(hum: HapticHum, scale: number): AndroidHapticStep[] {
  const s = clamp01(hum.intensity) * scale;

  if (hum.android) return [{ p: hum.android, s, at: hum.at }];

  switch (hum.shape ?? 'flat') {
    case 'rise':
      return [
        { p: hum.duration <= 250 ? 'quickRise' : 'slowRise', s, at: hum.at },
      ];
    case 'fall':
      return [{ p: 'quickFall', s, at: hum.at }];
    case 'swell':
      return [
        {
          p: hum.duration * 0.6 <= 250 ? 'quickRise' : 'slowRise',
          s,
          at: hum.at,
        },
        { p: 'quickFall', s, at: Math.round(hum.at + hum.duration * 0.6) },
      ];
    default: {
      // A rumble: low ticks across the hum.
      const primitive: AndroidPrimitive =
        hum.sharpness >= 0.5 ? 'tick' : 'lowTick';
      const count = Math.max(
        1,
        Math.round(hum.duration / ANDROID_RUMBLE_SPACING_MS),
      );

      return Array.from({ length: count }, (_, index) => ({
        p: primitive,
        s,
        at: Math.round(hum.at + index * ANDROID_RUMBLE_SPACING_MS),
      }));
    }
  }
}

export function renderAndroid(
  pattern: HapticPattern,
  strength: number,
): AndroidHapticStep[] {
  const scale = clamp01(strength);
  const steps: AndroidHapticStep[] = [];

  for (const event of forPlatform(pattern.events, 'android')) {
    if (event.type === 'tap') {
      const s = clamp01(event.intensity) * scale;

      steps.push({
        p:
          event.android ??
          androidTapPrimitive(event.intensity, event.sharpness),
        s,
        at: event.at,
      });
    } else {
      steps.push(...androidHumSteps(event, scale));
    }
  }

  steps.sort((a, b) => a.at - b.at);

  // A composition plays its primitives one after another, so a step that
  // starts deep inside the previous one would push everything after it late.
  // Keep the stronger of two heavily overlapping steps.
  const kept: AndroidHapticStep[] = [];

  for (const step of steps) {
    if (step.s < MIN_INTENSITY) continue;

    const previous = kept[kept.length - 1];

    if (
      previous &&
      step.at < previous.at + ANDROID_ESTIMATED_MS[previous.p] * 0.5
    ) {
      if (step.s > previous.s * 1.2) kept[kept.length - 1] = step;
      continue;
    }
    kept.push(step);
  }

  return kept
    .slice(0, ANDROID_MAX_STEPS)
    .map((step) => ({ ...step, s: round3(step.s), at: Math.round(step.at) }));
}

const fallbackKindFor = (intensity: number): HapticFallbackKind | null => {
  if (intensity >= 0.75) return 'heavy';
  if (intensity >= 0.45) return 'medium';
  if (intensity >= 0.2) return 'light';

  return null;
};

/** One step softer, for a low strength setting; notifications stay. */
const demoteKind = (kind: HapticFallbackKind): HapticFallbackKind | null => {
  switch (kind) {
    case 'heavy':
      return 'medium';
    case 'medium':
      return 'light';
    case 'light':
      return null;
    default:
      return kind;
  }
};

const FALLBACK_RANK: Record<HapticFallbackKind, number> = {
  light: 1,
  medium: 2,
  heavy: 3,
  warning: 3,
  error: 3,
  success: 4,
};

/** Where a hum is felt most, for the one preset that stands in for it. */
const humPeakAt = (hum: HapticHum) => {
  switch (hum.shape ?? 'flat') {
    case 'rise':
      return hum.at + hum.duration;
    case 'swell':
      return hum.at + hum.duration * 0.6;
    default:
      return hum.at;
  }
};

/** `@capacitor/haptics` presets, for binaries without the DouzeHaptics plugin. */
export function renderFallback(
  pattern: HapticPattern,
  strength: number,
): HapticFallbackStep[] {
  const demote = strength < 0.5;
  const candidates: HapticFallbackStep[] = [];

  if (pattern.fallback) {
    candidates.push(...pattern.fallback);
  } else {
    for (const event of pattern.events) {
      if (event.only === 'ios') continue;

      const kind = fallbackKindFor(clamp01(event.intensity) * strength);

      if (!kind) continue;

      candidates.push({
        at: event.type === 'hum' ? humPeakAt(event) : event.at,
        kind,
      });
    }
  }

  const steps = candidates
    .map((step) => ({
      at: step.at,
      kind: demote ? demoteKind(step.kind) : step.kind,
    }))
    .filter((step): step is HapticFallbackStep => step.kind !== null)
    .sort((a, b) => a.at - b.at);

  const kept: HapticFallbackStep[] = [];

  for (const step of steps) {
    const previous = kept[kept.length - 1];

    if (previous && step.at - previous.at < FALLBACK_MIN_GAP_MS) {
      if (FALLBACK_RANK[step.kind] > FALLBACK_RANK[previous.kind]) {
        kept[kept.length - 1] = { ...step, at: previous.at };
      }
      continue;
    }
    kept.push(step);
  }

  return kept.slice(0, FALLBACK_MAX_STEPS);
}
