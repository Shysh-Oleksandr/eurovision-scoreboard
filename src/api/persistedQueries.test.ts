import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import {
  isPersistedQueryKey,
  PERSISTED_QUERY_MAX_AGE_MS,
  registerPersistedQueryDefaults,
} from './persistedQueries';
import { queryKeys } from './queryKeys';

describe('persisted queries', () => {
  it('keeps the account lists in their default view only', () => {
    const firstPage = { page: 1, limit: 10, sortBy: 'createdAt' };

    expect(isPersistedQueryKey(queryKeys.user.profileSummary())).toBe(true);
    expect(isPersistedQueryKey(queryKeys.user.customEntries())).toBe(true);
    expect(isPersistedQueryKey(queryKeys.user.themesMeList(firstPage))).toBe(
      true,
    );
    expect(
      isPersistedQueryKey(
        queryKeys.user.themesMeList({ ...firstPage, page: 2 }),
      ),
    ).toBe(false);
    expect(
      isPersistedQueryKey(
        queryKeys.user.savedContestsList({ ...firstPage, search: 'malmo' }),
      ),
    ).toBe(false);
    expect(
      isPersistedQueryKey(
        queryKeys.user.contestsMeList({ ...firstPage, groupId: 'g1' }),
      ),
    ).toBe(false);
  });

  it('leaves out settings, per-item state and public content', () => {
    expect(isPersistedQueryKey(queryKeys.user.preferences())).toBe(false);
    expect(isPersistedQueryKey(queryKeys.user.themesState(['t1']))).toBe(false);
    expect(isPersistedQueryKey(['public', 'themes', { page: 1 }])).toBe(false);
  });

  it('keeps gcTime under the setTimeout limit (a longer one fires at once)', () => {
    expect(PERSISTED_QUERY_MAX_AGE_MS).toBeLessThan(2 ** 31 - 1);
  });

  it('registers the long gcTime and refetch-on-mount for those lists', () => {
    const client = new QueryClient();

    registerPersistedQueryDefaults(client);
    const options = client.defaultQueryOptions({
      queryKey: queryKeys.user.themesMeList({ page: 1 }),
    });

    expect(options.gcTime).toBe(PERSISTED_QUERY_MAX_AGE_MS);
    expect(options.refetchOnMount).toBe(true);
  });
});
