import { IS_NATIVE_APP } from './platform';

import { useGeneralStore } from '@/state/generalStore';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

/**
 * Haptics for the simulation's big moments, in the native apps only (the
 * `enableHaptics` setting). They ride on the theme sound events
 * (`playThemeSound`), which already mark those moments; frequent events
 * (every points line) stay silent. `@capacitor/haptics` is imported lazily so
 * it stays out of the website's bundle.
 */
const HAPTIC_BY_EVENT: Partial<
  Record<ThemeSoundEventId, 'heavy' | 'light' | 'success'>
> = {
  douzePoints: 'heavy',
  qualifierReveal: 'light',
  qualifierPicked: 'light',
  winner: 'success',
};

export function playHaptic(event: ThemeSoundEventId): void {
  if (!IS_NATIVE_APP) return;

  const kind = HAPTIC_BY_EVENT[event];

  if (!kind || !useGeneralStore.getState().settings.enableHaptics) return;

  (async () => {
    const { Capacitor } = await import('@capacitor/core');

    if (!Capacitor.isNativePlatform()) return;

    const { Haptics, ImpactStyle, NotificationType } = await import(
      '@capacitor/haptics'
    );

    if (kind === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.impact({
        style: kind === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Light,
      });
    }
  })().catch(() => undefined);
}
