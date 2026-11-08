import type { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClient,
  type PersistedClient,
  type Persister,
} from '@tanstack/react-query-persist-client';

import {
  isPersistedQueryKey,
  PERSISTED_QUERY_MAX_AGE_MS,
} from './persistedQueries';

import { getDB } from '@/helpers/indexedDB';

/**
 * Keeps the account's own lists (`persistedQueries.ts`) in IndexedDB so an
 * offline launch shows them (docs/offline-mode.md). Loaded lazily from
 * `queryClient.ts`, off the boot path.
 *
 * Stored under one key in `appAssets` (an out-of-line-key store with no
 * other use). A fresh connection per call (`getDB()`) sidesteps the iOS
 * WKWebView bug that drops long-lived IndexedDB connections.
 */
const STORE = 'appAssets';
const KEY = 'queryCache';
/** Bump when a persisted query's data shape changes: old copies are dropped. */
const VERSION = '1';
/** Cache events come in bursts (every fetch, every observer). */
const SAVE_THROTTLE_MS = 1000;

function createIndexedDbPersister(): Persister {
  let pending: PersistedClient | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    timer = undefined;
    const client = pending;

    pending = null;
    if (!client) return;

    try {
      const db = await getDB();

      await db.put(STORE, client, KEY);
    } catch (error) {
      console.warn('Could not save the offline copy', error);
    }
  };

  return {
    persistClient: (client) => {
      pending = client;
      timer ??= setTimeout(() => void flush(), SAVE_THROTTLE_MS);
    },
    restoreClient: async () => {
      try {
        const db = await getDB();

        return (await db.get(STORE, KEY)) as PersistedClient | undefined;
      } catch (error) {
        console.warn('Could not read the offline copy', error);

        return undefined;
      }
    },
    removeClient: async () => {
      pending = null;
      clearTimeout(timer);
      timer = undefined;

      try {
        const db = await getDB();

        await db.delete(STORE, KEY);
      } catch {
        // Nothing stored, or storage unavailable: nothing to remove.
      }
    },
  };
}

/**
 * The account signed in at launch (the persisted `auth-store`): a copy saved
 * for another account, or while signed out, is dropped instead of restored.
 */
function launchAccountId(): string {
  try {
    const stored = JSON.parse(localStorage.getItem('auth-store') ?? 'null');

    return stored?.state?.user?._id ?? 'none';
  } catch {
    return 'none';
  }
}

/**
 * Restores the saved copy into `client`, then saves it again on every cache
 * change. Signing out removes the account's queries (`clearUserData`), and
 * the next save writes the copy without them.
 */
export function startQueryPersistence(client: QueryClient): Promise<void> {
  const [, restored] = persistQueryClient({
    queryClient: client,
    persister: createIndexedDbPersister(),
    maxAge: PERSISTED_QUERY_MAX_AGE_MS,
    buster: `${VERSION}:${launchAccountId()}`,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && isPersistedQueryKey(query.queryKey),
      shouldDehydrateMutation: () => false,
    },
  });

  return restored;
}
