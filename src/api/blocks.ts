import { useMemo } from 'react';

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

import { useAuthStore } from '@/state/useAuthStore';

/**
 * Blocking (`/profiles/:id/block`, `/profiles/me/blocks`). A block hides each
 * user's content from the other in community lists, search and profiles,
 * ends any follow between them and stops new ones. The server filters the
 * lists; the client only needs the blocked IDs for the profile UI.
 */
export interface BlockedUser {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  blockedAt?: string;
}

export function useBlockedUsersQuery(enabled = true) {
  const isSignedIn = useAuthStore((s) => !!s.user);

  return useQuery<{ items: BlockedUser[] }>({
    queryKey: queryKeys.user.blockedUsers(),
    queryFn: async () => {
      const { data } = await api.get('/profiles/me/blocks');

      return data as { items: BlockedUser[] };
    },
    enabled: enabled && isSignedIn,
    staleTime: 5 * 60_000,
  });
}

/** IDs of the users the signed-in user has blocked (empty when signed out). */
export function useBlockedUserIds(): Set<string> {
  const { data } = useBlockedUsersQuery();

  return useMemo(() => new Set((data?.items ?? []).map((u) => u._id)), [data]);
}

/**
 * Everything a block changes: community lists, search, feeds, follows.
 * Queries don't refetch on mount (queryClient defaults), so cached lists that
 * aren't on screen are dropped rather than just marked stale.
 */
function invalidateAfterBlockChange(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.user.blockedUsers() });
  qc.invalidateQueries({ queryKey: queryKeys.user.profileSummary() });

  for (const queryKey of [['public'], ['users'], ['follows']]) {
    qc.removeQueries({ queryKey, type: 'inactive' });
    qc.invalidateQueries({ queryKey });
  }
}

export function useBlockUserMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/profiles/${userId}/block`);
    },
    onSuccess: () => invalidateAfterBlockChange(qc),
  });
}

export function useUnblockUserMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/profiles/${userId}/block`);
    },
    onSuccess: () => invalidateAfterBlockChange(qc),
  });
}
