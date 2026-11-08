import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * The account's own lists that are kept on the device between launches, so
 * an offline launch still shows them (docs/offline-mode.md): the library
 * counts, custom entries, the first page of each "yours" / "saved" list and
 * the quick-select lists. Search results, other pages, public content and
 * the account's settings (`SyncUserPreferences` decides those) aren't.
 */
const PERSISTED_PREFIXES: readonly (readonly string[])[] = [
  ['user', 'profile-summary'],
  ['user', 'custom-entries'],
  ['user', 'custom-entry-groups'],
  ['user', 'themes', 'me'],
  ['user', 'saved-themes'],
  ['user', 'theme-groups'],
  ['user', 'contests', 'me'],
  ['user', 'saved-contests'],
  ['user', 'contest-groups'],
  ['user', 'fonts', 'me'],
  ['user', 'quick-select-contests'],
  ['user', 'quick-select-themes'],
];

/**
 * How long an unused copy is kept (the restore drops anything older). Also
 * the queries' `gcTime`, so it must stay under setTimeout's limit (2^31 - 1
 * ms, about 24.8 days): a longer timer fires at once, and React Query then
 * garbage-collects every restored query that no screen is showing yet.
 */
export const PERSISTED_QUERY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const startsWith = (key: QueryKey, prefix: readonly string[]) =>
  prefix.every((part, i) => key[i] === part);

/** List filters past the prefix: only the default view is kept. */
const isDefaultView = (filters: unknown) => {
  if (filters === undefined) return true;
  if (!filters || typeof filters !== 'object') return false;

  const { page, search, groupId } = filters as {
    page?: number;
    search?: string;
    groupId?: string;
  };

  return (page ?? 1) === 1 && !search && !groupId;
};

export function isPersistedQueryKey(key: QueryKey): boolean {
  const prefix = PERSISTED_PREFIXES.find((p) => startsWith(key, p));

  return !!prefix && isDefaultView(key[prefix.length]);
}

/**
 * Defaults for the persisted lists, registered before any query exists:
 * - kept in memory as long as on disk, or the next save would drop them;
 * - refetched on mount once stale. The app's default (`refetchOnMount:
 *   false`) would leave a list restored from disk showing that copy forever.
 */
export function registerPersistedQueryDefaults(client: QueryClient) {
  PERSISTED_PREFIXES.forEach((prefix) =>
    client.setQueryDefaults([...prefix], {
      gcTime: PERSISTED_QUERY_MAX_AGE_MS,
      refetchOnMount: true,
    }),
  );
}
