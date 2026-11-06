import { useEffect, useState } from 'react';

import { useShallow } from 'zustand/shallow';

import {
  type AppPromoContext,
  type DevicePlatform,
  detectDevicePlatform,
  dismissCard,
  hubCardVariant,
  isReminderDue,
  markReminderShown,
} from './appPromoPolicy';
import { pickAppPromoMemory, useAppPromoStore } from './appPromoStore';
import {
  androidAppInstalledResult,
  checkAndroidAppInstalled,
} from './installedApp';

import { APP_STORES_LIVE, APP_STORES_RELEASE_DATE } from '@/config/appStores';
import { useAuthStore } from '@/state/useAuthStore';

const readPlatform = (): DevicePlatform =>
  typeof navigator === 'undefined'
    ? 'desktop'
    : detectDevicePlatform(navigator.userAgent, navigator.maxTouchPoints);

/** The device's store platform, read once (client components only). */
export function useDevicePlatform(): DevicePlatform {
  const [platform] = useState(readPlatform);

  return platform;
}

const initialInstalled = (platform: DevicePlatform): boolean | null => {
  if (platform !== 'android' || !APP_STORES_LIVE) return false;

  return androidAppInstalledResult();
};

function useAppPromoContext(): AppPromoContext {
  const platform = useDevicePlatform();
  const [installed, setInstalled] = useState(() => initialInstalled(platform));
  const hasAppAccount = useAuthStore((state) => !!state.user?.appSignedInAt);

  useEffect(() => {
    if (installed !== null) return undefined;

    let cancelled = false;

    void checkAndroidAppInstalled().then((value) => {
      if (!cancelled) setInstalled(value);
    });

    return () => {
      cancelled = true;
    };
  }, [installed]);

  return {
    releaseDate: APP_STORES_LIVE ? APP_STORES_RELEASE_DATE : null,
    now: Date.now(),
    platform,
    installed,
    hasAppAccount,
  };
}

/** The setup hub's app card: which variant shows, and its actions. */
export function useHubAppCard() {
  const ctx = useAppPromoContext();
  const memory = useAppPromoStore(useShallow(pickAppPromoMemory));
  const update = useAppPromoStore((state) => state.update);
  const variant = hubCardVariant(memory, ctx);

  return {
    variant,
    platform: ctx.platform,
    dismiss: () =>
      update((current) =>
        variant === 'open'
          ? { ...current, openRowDismissed: true }
          : dismissCard(current, ctx.platform, Date.now()),
      ),
  };
}

/**
 * The reminder under the winner: decided once when the winner modal opens
 * (counting it as shown), so it doesn't vanish while the modal is up.
 */
export function useAppReminder() {
  const platform = useDevicePlatform();
  const update = useAppPromoStore((state) => state.update);
  const [visible] = useState(() =>
    isReminderDue(pickAppPromoMemory(useAppPromoStore.getState()), {
      releaseDate: APP_STORES_LIVE ? APP_STORES_RELEASE_DATE : null,
      now: Date.now(),
      platform,
      installed: initialInstalled(platform),
      hasAppAccount: !!useAuthStore.getState().user?.appSignedInAt,
    }),
  );

  useEffect(() => {
    if (visible) update((current) => markReminderShown(current, Date.now()));
  }, [visible, update]);

  return { visible, platform };
}
