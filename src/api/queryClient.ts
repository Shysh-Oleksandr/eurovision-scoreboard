import { onlineManager, QueryClient } from '@tanstack/react-query';

import { registerPersistedQueryDefaults } from './persistedQueries';

import {
  connectivityStatus,
  isOffline,
  useConnectivityStore,
} from '@/state/connectivityStore';

/**
 * React Query's own online signal is the window's `online`/`offline` events,
 * which the apps' WebViews don't fire reliably, and it assumes online at
 * launch. The connectivity store knows better (native Network plugin + API
 * probes): queries pause while it says offline and refetch when it's back.
 */
onlineManager.setEventListener((setOnline) => {
  setOnline(!isOffline());

  return useConnectivityStore.subscribe((state) =>
    setOnline(connectivityStatus(state) === 'online'),
  );
});

/**
 * Shared QueryClient instance.
 * This allows us to access the query client from outside React components,
 * such as in Zustand stores or other utilities.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 5 * 60_000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;

        if (status === 401 || status === 403) return false;

        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      retry: 0,
      // The default ('online') pauses a mutation while offline and runs it
      // whenever the connection returns: a spinner until then, and a like or
      // save landing long after the user gave up. Fail at once instead; the
      // error toast carries the offline message (`NetworkError`).
      networkMode: 'always',
    },
  },
});

registerPersistedQueryDefaults(queryClient);

/**
 * The account's own lists are kept on the device (`queryPersistence.ts`,
 * lazily loaded). Resolves once the saved copy is back in the cache, or at
 * once where there's nothing to restore (server, tests).
 */
const restored: Promise<void> =
  typeof window !== 'undefined' &&
  typeof indexedDB !== 'undefined' &&
  process.env.NODE_ENV !== 'test'
    ? import('./queryPersistence')
        .then(({ startQueryPersistence }) => startQueryPersistence(queryClient))
        .catch((error) => console.warn('Offline copy unavailable', error))
    : Promise.resolve();

export const whenQueryCacheRestored = () => restored;
