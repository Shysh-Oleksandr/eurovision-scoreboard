import { IS_NATIVE_APP } from '../platform';

import { buildHapticPattern, type HapticCue } from './cues';
import {
  patternDuration,
  rebasePattern,
  renderAndroid,
  renderFallback,
  renderIos,
} from './render';
import { simpleHapticFor, simpleHapticPattern } from './simple';
import type {
  AndroidHapticStep,
  HapticFallbackKind,
  HapticFallbackStep,
  HapticPattern,
  HapticPriority,
  IosHapticEvent,
} from './types';

import { useGeneralStore } from '@/state/generalStore';

export type { HapticCue, HapticCueId } from './cues';
export { buildHapticPattern } from './cues';
export type { HapticPattern } from './types';

/**
 * Haptics for the native apps (docs/haptics.md). Call sites name a moment
 * (`playHaptic({ id: 'douzeHit' })`) at the frame it becomes visible; this
 * module builds the cue's pattern, decides whether it may play (setting,
 * priorities), renders it for the platform and hands it to the app's own
 * DouzeHaptics plugin: Core Haptics on iOS, composition primitives on
 * Android. Binaries without the plugin get `@capacitor/haptics` presets.
 * Capacitor is imported lazily so it stays out of the website's bundle.
 */

interface HapticsCapabilities {
  supportsHaptics: boolean;
  /** Android: composition primitives are available (API 30+). */
  composition?: boolean;
  /** Android: the primitives the vibrator supports. */
  primitives?: string[];
  amplitudeControl?: boolean;
}

interface DouzeHapticsPlugin {
  getCapabilities(): Promise<HapticsCapabilities>;
  prepare(): Promise<void>;
  play(options: {
    events?: IosHapticEvent[];
    steps?: AndroidHapticStep[];
    interrupt?: boolean;
  }): Promise<void>;
  stop(): Promise<void>;
  startLive(options: { intensity: number; sharpness: number }): Promise<void>;
  updateLive(options: { intensity: number }): Promise<void>;
  stopLive(): Promise<void>;
}

type CapacitorHapticsModule = typeof import('@capacitor/haptics');

type Backend =
  | {
      kind: 'plugin';
      platform: 'ios' | 'android';
      plugin: DouzeHapticsPlugin;
      capabilities: HapticsCapabilities;
    }
  | {
      kind: 'fallback';
      Haptics: CapacitorHapticsModule['Haptics'];
      ImpactStyle: CapacitorHapticsModule['ImpactStyle'];
      NotificationType: CapacitorHapticsModule['NotificationType'];
    }
  | { kind: 'none'; reason: 'web' | 'no-hardware' | 'error' };

const noop = () => undefined;

/** A cue still waiting for the backend after this long is dropped. */
const STALE_MS = 250;

/** Ticks closer together than this blur into a buzz. */
const MIN_TICK_GAP_MS = 35;

const LIVE_UPDATE_INTERVAL_MS = 50;

let backend: Backend | null = null;
let backendPromise: Promise<void> | null = null;

// ── Admission: settings, priorities, tick spacing ───────────────────────────

export interface HapticGate {
  holdUntil: number;
  holdPriority: number;
  lastTickAt: number;
}

const gate: HapticGate = {
  holdUntil: 0,
  holdPriority: -1,
  lastTickAt: -Infinity,
};

let lastPlayedAt = -Infinity;

/** How long ago the last cue played, in ms (Infinity if none has). */
export function msSinceLastHaptic(): number {
  return performance.now() - lastPlayedAt;
}

/**
 * Whether a cue of `priority` may play at `now`: not while a stronger cue
 * is held, and ticks not closer than {@link MIN_TICK_GAP_MS}.
 */
export function admitHapticCue(
  state: HapticGate,
  priority: HapticPriority,
  now: number,
): boolean {
  if (now < state.holdUntil && priority < state.holdPriority) return false;
  if (priority === 0 && now - state.lastTickAt < MIN_TICK_GAP_MS) return false;

  return true;
}

/** Records a cue that is about to play. */
export function holdHapticCue(
  state: HapticGate,
  pattern: HapticPattern,
  now: number,
): void {
  state.holdUntil = now + (pattern.holdMs ?? patternDuration(pattern));
  state.holdPriority = pattern.priority;
  if (pattern.priority === 0) state.lastTickAt = now;
}

// ── Debug log (the Haptics lab, and `dp-haptics-debug` in development) ──────

/** `skipped`: simple mode has nothing for this moment. */
export type HapticLogResult =
  | 'played'
  | 'dropped'
  | 'off'
  | 'hidden'
  | 'skipped';

export interface HapticLogEntry {
  /** `performance.now()` when the cue was asked for. */
  time: number;
  label: string;
  priority: HapticPriority;
  result: HapticLogResult;
  durationMs: number;
}

const logListeners = new Set<(entry: HapticLogEntry) => void>();

export function subscribeHapticLog(
  listener: (entry: HapticLogEntry) => void,
): () => void {
  logListeners.add(listener);

  return () => {
    logListeners.delete(listener);
  };
}

/**
 * Development only: with `localStorage['dp-haptics-debug'] = '1'` cues are
 * logged to the console and `window.__dpHapticsLog`, also on the website's
 * dev server, so their timing can be checked against the animations in a
 * desktop browser.
 */
function isDebugEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem('dp-haptics-debug') === '1';
  } catch {
    return false;
  }
}

function logCue(
  label: string,
  pattern: HapticPattern,
  result: HapticLogResult,
  time: number,
): void {
  const debug = isDebugEnabled();

  if (logListeners.size === 0 && !debug) return;

  const entry: HapticLogEntry = {
    time,
    label,
    priority: pattern.priority,
    result,
    durationMs: patternDuration(pattern),
  };

  logListeners.forEach((listener) => listener(entry));

  if (debug) {
    const holder = window as unknown as { __dpHapticsLog?: HapticLogEntry[] };

    holder.__dpHapticsLog = [...(holder.__dpHapticsLog ?? []), entry].slice(
      -200,
    );
    // eslint-disable-next-line no-console
    console.info(
      `[haptics] ${Math.round(time)}ms ${label} (p${
        pattern.priority
      }) ${result}`,
    );
  }
}

// ── Backend ─────────────────────────────────────────────────────────────────

async function resolveBackend(): Promise<void> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');

    if (!Capacitor.isNativePlatform()) {
      backend = { kind: 'none', reason: 'web' };

      return;
    }

    const platform = Capacitor.getPlatform();

    if (
      (platform === 'ios' || platform === 'android') &&
      Capacitor.isPluginAvailable('DouzeHaptics')
    ) {
      const plugin = registerPlugin<DouzeHapticsPlugin>('DouzeHaptics');
      const capabilities = await plugin.getCapabilities();

      backend = capabilities.supportsHaptics
        ? { kind: 'plugin', platform, plugin, capabilities }
        : { kind: 'none', reason: 'no-hardware' };

      return;
    }

    // A binary built before the plugin: the stock presets.
    const { Haptics, ImpactStyle, NotificationType } = await import(
      '@capacitor/haptics'
    );

    backend = { kind: 'fallback', Haptics, ImpactStyle, NotificationType };
  } catch {
    backend = { kind: 'none', reason: 'error' };
  }
}

function ensureBackend(): Promise<void> {
  if (!backendPromise) backendPromise = resolveBackend();

  return backendPromise;
}

function playFallbackStep(
  fallback: Extract<Backend, { kind: 'fallback' }>,
  kind: HapticFallbackKind,
): void {
  const { Haptics, ImpactStyle, NotificationType } = fallback;
  let call: Promise<void>;

  switch (kind) {
    case 'success':
      call = Haptics.notification({ type: NotificationType.Success });
      break;
    case 'warning':
      call = Haptics.notification({ type: NotificationType.Warning });
      break;
    case 'error':
      call = Haptics.notification({ type: NotificationType.Error });
      break;
    default:
      call = Haptics.impact({
        style:
          kind === 'heavy'
            ? ImpactStyle.Heavy
            : kind === 'medium'
            ? ImpactStyle.Medium
            : ImpactStyle.Light,
      });
  }
  call.catch(noop);
}

function playFallback(
  fallback: Extract<Backend, { kind: 'fallback' }>,
  steps: HapticFallbackStep[],
): void {
  for (const step of steps) {
    if (step.at <= 0) {
      playFallbackStep(fallback, step.kind);
    } else {
      setTimeout(() => playFallbackStep(fallback, step.kind), step.at);
    }
  }
}

function dispatch(
  pattern: HapticPattern,
  strength: number,
  requestedAt: number,
): void {
  if (!backend) {
    void ensureBackend().then(() => {
      if (performance.now() - requestedAt <= STALE_MS) {
        dispatch(pattern, strength, requestedAt);
      }
    });

    return;
  }

  const rebased = rebasePattern(pattern);

  if (rebased.offset > 0) {
    setTimeout(() => send(rebased.pattern, strength), rebased.offset);
  } else {
    send(pattern, strength);
  }
}

function send(pattern: HapticPattern, strength: number): void {
  if (!backend) return;

  switch (backend.kind) {
    case 'plugin':
      if (backend.platform === 'ios') {
        backend.plugin
          .play({
            events: renderIos(pattern, strength),
            // Android cuts the running vibration anyway; on iOS a big
            // moment stops the cues still ringing so it lands clean.
            interrupt: pattern.priority >= 2,
          })
          .catch(noop);
      } else {
        backend.plugin
          .play({ steps: renderAndroid(pattern, strength) })
          .catch(noop);
      }
      break;
    case 'fallback':
      playFallback(backend, renderFallback(pattern, strength));
      break;
    default:
      break;
  }
}

function readSettings() {
  const { enableHaptics, hapticsStrength } =
    useGeneralStore.getState().settings;

  return {
    enabled: enableHaptics,
    strength:
      typeof hapticsStrength === 'number' && Number.isFinite(hapticsStrength)
        ? Math.min(1, Math.max(0, hapticsStrength))
        : 1,
  };
}

/** Plays a pattern as is (the Haptics lab's editor; cues use {@link playHaptic}). */
export function playHapticPattern(
  pattern: HapticPattern,
  label = 'pattern',
): void {
  if (!IS_NATIVE_APP && !isDebugEnabled() && logListeners.size === 0) return;

  const now = performance.now();
  const { enabled, strength } = readSettings();

  if (!enabled) {
    logCue(label, pattern, 'off', now);

    return;
  }
  if (typeof document !== 'undefined' && document.hidden) {
    logCue(label, pattern, 'hidden', now);

    return;
  }
  if (!admitHapticCue(gate, pattern.priority, now)) {
    logCue(label, pattern, 'dropped', now);

    return;
  }

  holdHapticCue(gate, pattern, now);
  lastPlayedAt = now;
  logCue(label, pattern, 'played', now);

  if (!IS_NATIVE_APP) return;

  dispatch(pattern, strength, now);
}

// ── Simple mode ─────────────────────────────────────────────────────────────

export type HapticsMode = 'full' | 'simple';

let modeOverride: HapticsMode | null = null;

/** Forces a mode (the Haptics lab); null goes back to the device's. */
export function setHapticsModeOverride(mode: HapticsMode | null): void {
  modeOverride = mode;
}

/**
 * Simple mode for motors that can only knock: Android without composition
 * primitives, and binaries without the DouzeHaptics plugin (simple.ts).
 */
function currentMode(): HapticsMode {
  if (modeOverride) return modeOverride;
  if (backend?.kind === 'fallback') return 'simple';
  if (
    backend?.kind === 'plugin' &&
    backend.platform === 'android' &&
    !backend.capabilities.composition
  ) {
    return 'simple';
  }

  return 'full';
}

function playCue(cue: HapticCue): void {
  const pattern = buildHapticPattern(cue);

  if (currentMode() === 'full') {
    playHapticPattern(pattern, cue.id);

    return;
  }

  const simple = simpleHapticFor(cue);
  // Without amplitude control a tick is the softest there is: a low
  // strength leaves only the stronger knocks.
  const tooSoft = simple?.effect === 'tick' && readSettings().strength < 0.5;

  if (!simple || tooSoft) {
    logCue(cue.id, pattern, 'skipped', performance.now());

    return;
  }

  playHapticPattern(simpleHapticPattern(simple, pattern.priority), cue.id);
}

/**
 * Plays a cue, now or after `delayMs`. Call it at the frame the moment
 * becomes visible: in the store action for an award, in the timeline or the
 * mount effect for an animation.
 */
export function playHaptic(cue: HapticCue, options?: { delayMs?: number }) {
  if (!IS_NATIVE_APP && !isDebugEnabled() && logListeners.size === 0) return;

  if (options?.delayMs && options.delayMs > 0) {
    setTimeout(() => playHaptic(cue), options.delayMs);

    return;
  }

  // The mode depends on the device: learn it before the first cue.
  if (IS_NATIVE_APP && !backend) {
    const requestedAt = performance.now();

    void ensureBackend().then(() => {
      if (performance.now() - requestedAt <= STALE_MS) playCue(cue);
    });

    return;
  }

  playCue(cue);
}

/** Warms the backend (and the iOS haptic engine) before the first cue. */
export function prepareHaptics(): void {
  if (!IS_NATIVE_APP || !readSettings().enabled) return;

  void ensureBackend().then(() => {
    if (backend?.kind === 'plugin') backend.plugin.prepare().catch(noop);
  });
}

/** Stops everything playing and clears the priority hold. */
export function stopHaptics(): void {
  gate.holdUntil = 0;
  gate.holdPriority = -1;
  stopHapticRumble();
  if (backend?.kind === 'plugin') backend.plugin.stop().catch(noop);
}

// ── Live rumble (iOS: a continuous player whose intensity follows a value) ──

let isRumbleActive = false;
let lastRumbleUpdateAt = 0;

export function startHapticRumble(intensity: number, sharpness = 0.2): void {
  if (!IS_NATIVE_APP) return;

  const { enabled, strength } = readSettings();

  if (!enabled) return;

  isRumbleActive = true;
  void ensureBackend().then(() => {
    if (!isRumbleActive) return;
    if (backend?.kind !== 'plugin' || backend.platform !== 'ios') return;

    backend.plugin
      .startLive({ intensity: intensity * strength, sharpness })
      .catch(noop);
  });
}

export function setHapticRumble(intensity: number): void {
  if (!isRumbleActive) return;
  if (backend?.kind !== 'plugin' || backend.platform !== 'ios') return;

  const now = performance.now();

  if (now - lastRumbleUpdateAt < LIVE_UPDATE_INTERVAL_MS) return;
  lastRumbleUpdateAt = now;

  backend.plugin
    .updateLive({ intensity: intensity * readSettings().strength })
    .catch(noop);
}

export function stopHapticRumble(): void {
  if (!isRumbleActive) return;
  isRumbleActive = false;
  if (backend?.kind === 'plugin' && backend.platform === 'ios') {
    backend.plugin.stopLive().catch(noop);
  }
}

// ── The final televote reveal's heartbeat ───────────────────────────────────

export interface HapticHeartbeat {
  start: () => void;
  stop: () => void;
}

/**
 * A heartbeat that speeds up (about 63 to 170 bpm) and strengthens as
 * `getCloseness()` goes from 0 to 1, over a rumble that swells with it.
 */
export function createHapticHeartbeat(
  getCloseness: () => number,
): HapticHeartbeat {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const beat = () => {
    if (!running) return;

    const closeness = Math.min(1, Math.max(0, getCloseness()));

    playHaptic({ id: 'revealBeat', closeness });
    setHapticRumble(0.06 + 0.4 * closeness * closeness);
    timer = setTimeout(beat, 950 - 600 * Math.pow(closeness, 1.3));
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      startHapticRumble(0.06, 0.15);
      beat();
    },
    stop: () => {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      stopHapticRumble();
    },
  };
}

// ── Status (the Haptics lab) ────────────────────────────────────────────────

export interface HapticsStatus {
  backend: Backend['kind'];
  mode: HapticsMode;
  platform?: 'ios' | 'android';
  reason?: string;
  capabilities?: HapticsCapabilities;
}

export async function getHapticsStatus(): Promise<HapticsStatus> {
  if (!IS_NATIVE_APP) {
    return { backend: 'none', mode: currentMode(), reason: 'website' };
  }

  await ensureBackend();

  const mode = currentMode();

  if (!backend) return { backend: 'none', mode, reason: 'error' };

  switch (backend.kind) {
    case 'plugin':
      return {
        backend: 'plugin',
        mode,
        platform: backend.platform,
        capabilities: backend.capabilities,
      };
    case 'fallback':
      return { backend: 'fallback', mode };
    default:
      return { backend: 'none', mode, reason: backend.reason };
  }
}
