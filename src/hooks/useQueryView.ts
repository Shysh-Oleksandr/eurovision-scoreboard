import type { FetchStatus, QueryStatus } from '@tanstack/react-query';

import { useIsOffline } from '@/state/connectivityStore';

/**
 * What a screen backed by one query should show:
 * - `ready`: data (cached data counts, also offline), or nothing to load
 *   (a disabled query: the screen shows its own empty state);
 * - `loading`: the first load is under way;
 * - `offline`: no data and the app can't reach the API (a paused query, a
 *   hanging one once the app knows, or one that failed for that reason);
 * - `error`: the API answered with an error.
 */
export type QueryView = 'loading' | 'offline' | 'error' | 'ready';

type QueryLike = {
  data: unknown;
  status: QueryStatus;
  fetchStatus: FetchStatus;
};

export function queryView(query: QueryLike, offline: boolean): QueryView {
  if (query.data !== undefined) return 'ready';
  if (offline || query.fetchStatus === 'paused') return 'offline';
  if (query.status === 'error') return 'error';
  if (query.fetchStatus === 'fetching') return 'loading';

  return 'ready';
}

/**
 * `queryView` for a query result, with the app's connectivity. Render
 * `QueryNotice` (src/components/offline/OfflineNotice.tsx) for anything but
 * `ready`, so a screen never spins or says "nothing found" because it's
 * offline.
 */
export function useQueryView(query: QueryLike): QueryView {
  return queryView(query, useIsOffline());
}
