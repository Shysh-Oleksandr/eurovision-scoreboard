'use client';
import { useEffect, useMemo, useRef } from 'react';

import { isNetworkError } from '@/api/client';
import {
  useMyPreferencesQuery,
  useUpdatePreferencesMutation,
} from '@/api/profiles';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirmationStore } from '@/state/confirmationStore';
import { isOffline, onReconnect } from '@/state/connectivityStore';
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
 * Set while this device holds changes the account hasn't got: made offline,
 * or a save that got no answer. The next hydrate then pushes them instead of
 * applying the account's (older) copy. In localStorage: a relaunch can come
 * between the change and the connection.
 */
const UNSYNCED_KEY = 'dp:prefs-unsynced';

const setUnsynced = (unsynced: boolean) => {
  try {
    if (unsynced) localStorage.setItem(UNSYNCED_KEY, '1');
    else localStorage.removeItem(UNSYNCED_KEY);
  } catch {
    // Storage blocked: the account's copy wins as before.
  }
};

const hasUnsynced = () => {
  try {
    return localStorage.getItem(UNSYNCED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Headless: keeps the account-synced slice of client state (a whitelist of
 * global app/UX settings, presentation preferences, and confirmation dismissals
 * — see `syncedSettings.ts`) in sync with the logged-in user's profile.
 *
 * - On login, hydrate from the account (server-wins if it has data; otherwise
 *   seed the account from the current local state). Changes this device made
 *   offline win instead (`UNSYNCED_KEY`), and go up on reconnect.
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
  const hadUserRef = useRef(!!user);

  // Serialize only the whitelisted slice, so unrelated settings changes (or a
  // contest-load overwriting contest-bound fields) never look like a change.
  const serialized = useMemo(
    () =>
      JSON.stringify(toUserPreferences(settings, presentation, confirmations)),
    [settings, presentation, confirmations],
  );
  const debounced = useDebounce(serialized, SAVE_DEBOUNCE_MS);
  // What the stores held at launch: a later value is the user's change.
  const launchValueRef = useRef(serialized);

  const save = (value: string) => {
    updatePrefs.mutate(JSON.parse(value) as UserPreferences, {
      onSuccess: () => setUnsynced(false),
      onError: (error) => {
        if (isNetworkError(error)) setUnsynced(true);
      },
    });
  };

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
      // Signed out: those changes belonged to that account's session.
      if (hadUserRef.current) setUnsynced(false);
    }
    hadUserRef.current = !!user;
  }, [user]);

  // Back online after a save that got no answer: send the current state.
  useEffect(
    () =>
      onReconnect(() => {
        if (!hydratedRef.current || !hasUnsynced()) return;
        const local = snapshot();

        lastSyncedRef.current = local;
        save(local);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Hydrate once per login, as soon as the account's preferences arrive.
  useEffect(() => {
    if (!user || hydratedRef.current || !data) return;
    hydratedRef.current = true;

    if (hasUnsynced()) {
      // Changed here while offline: this device's state is the newer one.
      const local = snapshot();

      lastSyncedRef.current = local;
      save(local);
    } else if (hasSavedPreferences(data)) {
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
      save(local);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data]);

  // Debounced save on change (only genuine changes vs. the last synced snapshot).
  useEffect(() => {
    if (!user) return;
    if (!hydratedRef.current) {
      // Offline launch: the account's copy hasn't arrived to compare with.
      if (isOffline() && debounced !== launchValueRef.current) {
        setUnsynced(true);
      }

      return;
    }
    if (debounced === lastSyncedRef.current) return;
    lastSyncedRef.current = debounced;
    save(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, user]);

  return null;
};
