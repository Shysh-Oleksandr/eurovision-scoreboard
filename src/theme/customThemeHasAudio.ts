import { THEME_SOUND_EVENTS } from '@/theme/themeSoundEvents';
import type { CustomTheme } from '@/types/customTheme';

const HTTPS_AUDIO_URL = /^https:\/\/.+/i;

/** True if the theme defines at least one custom sound with a non-empty https URL. */
export function customThemeHasAnyAudio(
  theme: CustomTheme | null | undefined,
): boolean {
  if (!theme?.themeSounds) return false;
  return THEME_SOUND_EVENTS.some((eventId) => {
    const u = theme.themeSounds?.[eventId]?.url?.trim();
    return !!u && HTTPS_AUDIO_URL.test(u);
  });
}

export function customThemeHasSimulationBackground(
  theme: CustomTheme | null | undefined,
): boolean {
  const u = theme?.themeSounds?.simulationBackground?.url?.trim();
  return !!u && HTTPS_AUDIO_URL.test(u);
}
