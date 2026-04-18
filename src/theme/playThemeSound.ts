import type { Country, EventStage } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

/** Max concurrent one-shot theme SFX across different events (oldest stopped first). */
const MAX_CONCURRENT_THEME_SFX = 2;

const activeThemeSfx = new Set<HTMLAudioElement>();

/** FIFO by start time: first entry is oldest (evicted first under global cap). */
const activePlaybackOrder: {
  event: ThemeSoundEventId;
  audio: HTMLAudioElement;
}[] = [];

const pendingTimeoutByEvent = new Map<
  ThemeSoundEventId,
  ReturnType<typeof setTimeout>
>();

const audioCleanups = new Map<HTMLAudioElement, () => void>();

let sfxVolumeSubscribed = false;

function unregisterFromOrder(audio: HTMLAudioElement): void {
  const idx = activePlaybackOrder.findIndex((x) => x.audio === audio);

  if (idx >= 0) activePlaybackOrder.splice(idx, 1);
}

function teardownThemeSfxAudio(audio: HTMLAudioElement): void {
  const onDone = audioCleanups.get(audio);

  if (onDone) {
    audio.removeEventListener('ended', onDone);
    audio.removeEventListener('error', onDone);
    audioCleanups.delete(audio);
  }
  unregisterFromOrder(audio);
  activeThemeSfx.delete(audio);
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  } catch {
    // ignore
  }
}

function enforceGlobalSfxCap(): void {
  while (activePlaybackOrder.length > MAX_CONCURRENT_THEME_SFX) {
    const oldest = activePlaybackOrder.shift();

    if (oldest) teardownThemeSfxAudio(oldest.audio);
  }
}

/** Stops pending delayed play and any playing clip for this event id. */
function stopThemeSoundForEvent(event: ThemeSoundEventId): void {
  const tid = pendingTimeoutByEvent.get(event);

  if (tid !== undefined) {
    clearTimeout(tid);
    pendingTimeoutByEvent.delete(event);
  }
  for (let i = activePlaybackOrder.length - 1; i >= 0; i -= 1) {
    if (activePlaybackOrder[i].event === event) {
      teardownThemeSfxAudio(activePlaybackOrder[i].audio);
    }
  }
}

function applyVolumeToActiveThemeSfx(): void {
  const linear = getEffectiveThemeSfxVolumeLinear();

  for (const audio of activeThemeSfx) {
    try {
      if (linear <= 0) {
        audio.volume = 0;
        audio.muted = true;
      } else {
        audio.muted = false;
        audio.volume = linear;
      }
    } catch {
      teardownThemeSfxAudio(audio);
    }
  }
}

function registerActiveThemeSfx(
  event: ThemeSoundEventId,
  audio: HTMLAudioElement,
): void {
  ensureSfxVolumeSubscription();
  activeThemeSfx.add(audio);
  activePlaybackOrder.push({ event, audio });
  enforceGlobalSfxCap();

  const onDone = () => {
    audio.removeEventListener('ended', onDone);
    audio.removeEventListener('error', onDone);
    audioCleanups.delete(audio);
    unregisterFromOrder(audio);
    activeThemeSfx.delete(audio);
  };

  audio.addEventListener('ended', onDone);
  audio.addEventListener('error', onDone);
  audioCleanups.set(audio, onDone);
}

function ensureSfxVolumeSubscription(): void {
  if (typeof window === 'undefined' || sfxVolumeSubscribed) return;
  sfxVolumeSubscribed = true;

  let lastVol = useGeneralStore.getState().settings.themeSoundVolume;
  let lastDis = useGeneralStore.getState().settings.disableAllThemeAudio;

  useGeneralStore.subscribe(() => {
    const { themeSoundVolume, disableAllThemeAudio } =
      useGeneralStore.getState().settings;

    if (themeSoundVolume === lastVol && disableAllThemeAudio === lastDis) {
      return;
    }
    lastVol = themeSoundVolume;
    lastDis = disableAllThemeAudio;
    applyVolumeToActiveThemeSfx();
  });
}

/**
 * Plays a custom theme sound if the active custom theme defines a URL for this event.
 * Respects global themeSoundVolume. No-op without custom theme or URL.
 * Theme preview should not call this (callers pass skip or avoid invoking).
 * Volume for clips already playing updates when themeSoundVolume / disableAllThemeAudio change.
 *
 * Playback policy:
 * - Same event: stops any pending delayed play and any still-playing clip for that id, then plays.
 * - Global: at most {@link MAX_CONCURRENT_THEME_SFX} concurrent one-shots; oldest is stopped when exceeded.
 */

/** Linear 0–1 for one-shot theme SFX (respects disable-all). */
export function getEffectiveThemeSfxVolumeLinear(): number {
  const { settings } = useGeneralStore.getState();

  if (settings.disableAllThemeAudio) return 0;

  return Math.min(1, Math.max(0, settings.themeSoundVolume / 100));
}

/**
 * Stops every one-shot theme SFX from {@link playThemeSound} (playing or scheduled).
 * Does not affect simulation background music ({@link simulationBackgroundThemeSound}).
 */
export function stopAllPlayingThemeSfx(): void {
  for (const tid of pendingTimeoutByEvent.values()) {
    clearTimeout(tid);
  }
  pendingTimeoutByEvent.clear();

  for (const audio of [...activeThemeSfx]) {
    teardownThemeSfxAudio(audio);
  }
}

export function playThemeSound(
  event: ThemeSoundEventId,
  options?: { skip?: boolean },
): void {
  if (options?.skip) return;

  const { customTheme } = useGeneralStore.getState();
  const linear = getEffectiveThemeSfxVolumeLinear();

  if (linear <= 0) return;

  const slot = customTheme?.themeSounds?.[event];
  const url = slot?.url;

  if (!url?.trim()) return;

  const delayRaw = slot?.delayMs;
  const delayMs =
    typeof delayRaw === 'number' && Number.isFinite(delayRaw) && delayRaw > 0
      ? Math.min(60_000, Math.floor(delayRaw))
      : 0;

  stopThemeSoundForEvent(event);

  const start = () => {
    pendingTimeoutByEvent.delete(event);
    const audio = new Audio(url.trim());

    audio.volume = linear;
    registerActiveThemeSfx(event, audio);
    void audio.play().catch(() => {
      teardownThemeSfxAudio(audio);
    });
  };

  if (delayMs > 0) {
    const tid = setTimeout(start, delayMs);

    pendingTimeoutByEvent.set(event, tid);
  } else {
    start();
  }
}

/** True if this point value is the animated “douze” tier in the active points system. */
export function isVotingPointsValueDouzeTier(points: number): boolean {
  if (points <= 0) return false;
  const { pointsSystem } = useGeneralStore.getState();

  return pointsSystem.some((p) => p.value === points && p.showDouzePoints);
}

/** Jury / combined-style point lines only; not televote reveal. */
export function playThemeSoundPointsAwardedIfNonDouze(
  isDouzeOnly: boolean,
): void {
  if (isDouzeOnly) return;
  playThemeSound('pointsAwarded');
}

/** Televote point reveal (per country or bulk finish); skip when value is the douze tier. */
export function playThemeSoundTelevoteRevealIfNonDouze(
  isDouzeOnly: boolean,
): void {
  if (isDouzeOnly) return;
  playThemeSound('televotePointsReveal');
}

/**
 * After a stage ends: winner fanfare on Grand Final, otherwise stage-complete sting.
 */
export function notifyThemeSoundStageFinished(
  currentStage: EventStage,
  winnerCountry: Country | null,
): void {
  if (currentStage.isLastStage && winnerCountry) {
    setTimeout(() => {
      playThemeSound('winner');
    }, 1000);

    return;
  }
  if (!currentStage.isLastStage) {
    setTimeout(() => {
      playThemeSound('stageComplete');
    }, 1000);
  }
}
