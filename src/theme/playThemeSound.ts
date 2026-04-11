import type { Country, EventStage } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

const activeThemeSfx = new Set<HTMLAudioElement>();

let sfxVolumeSubscribed = false;

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
      activeThemeSfx.delete(audio);
    }
  }
}

function unregisterActiveThemeSfx(audio: HTMLAudioElement): void {
  activeThemeSfx.delete(audio);
}

function registerActiveThemeSfx(audio: HTMLAudioElement): void {
  ensureSfxVolumeSubscription();
  activeThemeSfx.add(audio);
  const onDone = () => {
    audio.removeEventListener('ended', onDone);
    audio.removeEventListener('error', onDone);
    unregisterActiveThemeSfx(audio);
  };
  audio.addEventListener('ended', onDone);
  audio.addEventListener('error', onDone);
}

function ensureSfxVolumeSubscription(): void {
  if (typeof window === 'undefined' || sfxVolumeSubscribed) return;
  sfxVolumeSubscribed = true;

  let lastVol = useGeneralStore.getState().settings.themeSoundVolume;
  let lastDis = useGeneralStore.getState().settings.disableAllThemeAudio;

  useGeneralStore.subscribe(() => {
    const { themeSoundVolume, disableAllThemeAudio } =
      useGeneralStore.getState().settings;
    if (
      themeSoundVolume === lastVol &&
      disableAllThemeAudio === lastDis
    ) {
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
 */

/** Linear 0–1 for one-shot theme SFX (respects disable-all). */
export function getEffectiveThemeSfxVolumeLinear(): number {
  const { settings } = useGeneralStore.getState();
  if (settings.disableAllThemeAudio) return 0;
  return Math.min(1, Math.max(0, settings.themeSoundVolume / 100));
}

export function playThemeSound(
  event: ThemeSoundEventId,
  options?: { skip?: boolean },
): void {
  if (options?.skip) return;

  const { customTheme } = useGeneralStore.getState();
  const linear = getEffectiveThemeSfxVolumeLinear();
  if (linear <= 0) return;

  const url = customTheme?.themeSounds?.[event]?.url;
  if (!url?.trim()) return;

  const audio = new Audio(url.trim());
  audio.volume = linear;
  registerActiveThemeSfx(audio);
  void audio.play().catch(() => {
    unregisterActiveThemeSfx(audio);
  });
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
