'use client';
import { useEffect, useMemo, useRef } from 'react';

import {
  useMyPreferencesQuery,
  useUpdatePreferencesMutation,
} from '@/api/profiles';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmationStore } from '@/state/confirmationStore';
import { useGeneralStore } from '@/state/generalStore';
import {
  applyUserPreferences,
  hasSavedPreferences,
  toUserPreferences,
  UserPreferences,
} from '@/state/syncedSettings';
import { useAuthStore } from '@/state/useAuthStore';

const SAVE_DEBOUNCE_MS = 1000;

/**
 * Headless: keeps the account-synced slice of client state (a whitelist of
 * global app/UX settings, presentation preferences, and confirmation dismissals
 * — see `syncedSettings.ts`) in sync with the logged-in user's profile.
 *
 * - On login, hydrate from the account (server-wins if it has data; otherwise
 *   seed the account from the current local state).
 * - On change, debounced-save the slice back to the account.
 * - Logged out, it's a no-op — local persistence (zustand `persist`) still keeps
 *   everything on this device.
 *
 * The save guard is value-based (compare the serialized slice against the last
 * synced snapshot) rather than a skip-counter, so a hydrate can't accidentally
 * swallow a real edit, and changes to non-synced fields never trigger a save.
 */
export const SyncUserPreferences = () => {
  const user = useAuthStore((s) => s.user);
  const { data } = useMyPreferencesQuery(!!user);
  const updatePrefs = useUpdatePreferencesMutation();

  const settings = useGeneralStore((s) => s.settings);
  const presentation = useGeneralStore((s) => s.presentationSettings);
  const confirmations = useConfirmationStore((s) => s.preferences);
  const setSettings = useGeneralStore((s) => s.setSettings);
  const setPresentationSettings = useGeneralStore(
    (s) => s.setPresentationSettings,
  );

  const hydratedRef = useRef(false);
  const lastSyncedRef = useRef<string | null>(null);

  // Serialize only the whitelisted slice, so unrelated settings changes (or a
  // contest-load overwriting contest-bound fields) never look like a change.
  const serialized = useMemo(
    () =>
      JSON.stringify(toUserPreferences(settings, presentation, confirmations)),
    [settings, presentation, confirmations],
  );
  const debounced = useDebounce(serialized, SAVE_DEBOUNCE_MS);

  const snapshot = (): string =>
    JSON.stringify(
      toUserPreferences(
        useGeneralStore.getState().settings,
        useGeneralStore.getState().presentationSettings,
        useConfirmationStore.getState().preferences,
      ),
    );

  // Reset the baseline whenever we drop to logged-out, so the next login
  // re-hydrates cleanly.
  useEffect(() => {
    if (!user) {
      hydratedRef.current = false;
      lastSyncedRef.current = null;
    }
  }, [user]);

  // Hydrate once per login, as soon as the account's preferences arrive.
  useEffect(() => {
    if (!user || hydratedRef.current || !data) return;
    hydratedRef.current = true;

    if (hasSavedPreferences(data)) {
      applyUserPreferences(data, {
        setSettings,
        setPresentationSettings,
        setConfirmations: (c) =>
          useConfirmationStore.setState({ preferences: c }),
      });
      // Baseline from the store AFTER applying (apply may transform, e.g. the
      // diaspora default-merge), so the save effect doesn't re-save immediately.
      lastSyncedRef.current = snapshot();
    } else {
      // Account has nothing saved yet — seed it from the current local state.
      const local = snapshot();

      lastSyncedRef.current = local;
      updatePrefs.mutate(JSON.parse(local) as UserPreferences);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data]);

  // Debounced save on change (only genuine changes vs. the last synced snapshot).
  useEffect(() => {
    if (!user || !hydratedRef.current) return;
    if (debounced === lastSyncedRef.current) return;
    lastSyncedRef.current = debounced;
    updatePrefs.mutate(JSON.parse(debounced) as UserPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, user]);

  return null;
};
