import { useGeneralStore } from '@/state/generalStore';

let audioEl: HTMLAudioElement | null = null;
let boundUrl: string | null = null;

function getEffectiveAmbienceLinear(): number {
  const { settings } = useGeneralStore.getState();
  if (settings.disableAllThemeAudio) return 0;
  return Math.min(1, Math.max(0, settings.themeAmbienceVolume / 100));
}

function applyBgAudioVolume(linear0to1: number) {
  if (!audioEl) return;
  if (linear0to1 <= 0) {
    audioEl.volume = 0;
    audioEl.muted = true;
    return;
  }
  audioEl.muted = false;
  audioEl.volume = Math.min(1, Math.max(0, linear0to1));
}

/**
 * Looped ambience while a contest is loaded (eventStages.length > 0).
 * Reuses one HTMLAudioElement; volume/mute updates do not restart playback.
 * Recreates the element only when the theme URL changes or after full stop.
 */
export function syncSimulationBackgroundThemeSound(enabled: boolean): void {
  const { customTheme } = useGeneralStore.getState();
  const url =
    customTheme?.themeSounds?.simulationBackground?.url?.trim() ?? '';
  const effective = getEffectiveAmbienceLinear();

  if (!enabled || !url) {
    stopSimulationBackgroundThemeSound();
    return;
  }

  if (!audioEl || boundUrl !== url) {
    if (audioEl) {
      stopSimulationBackgroundThemeSound();
    }
    boundUrl = url;
    audioEl = new Audio(url);
    audioEl.loop = true;
    applyBgAudioVolume(effective);
    void audioEl.play().catch(() => {
      stopSimulationBackgroundThemeSound();
    });
    return;
  }

  applyBgAudioVolume(effective);
  if (effective > 0 && audioEl.paused) {
    void audioEl.play().catch(() => {
      stopSimulationBackgroundThemeSound();
    });
  }
}

export function stopSimulationBackgroundThemeSound(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    audioEl = null;
  }
  boundUrl = null;
}
