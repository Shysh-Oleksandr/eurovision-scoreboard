import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

import type {
  Contest,
  ContestGroupSummary,
  ContestListResponse,
  ContestState,
} from '@/types/contest';
import type { ContestSnapshot } from '@/types/contestSnapshot';
import type { EntryStatsResponse } from '@/types/entryStats';
import type { PublicLeaderboardResponse } from '@/types/publicLeaderboard';

export type CreateContestInput = {
  name: string;
  description?: string;
  venue?: string;
  hosts?: string;
  isPublic?: boolean;
  themeId?: string;
  standardThemeId?: string;
  year?: number;
  hostingCountryCode: string;
  snapshot: Record<string, any>;
  groupId?: string;
};

export type UpdateContestInput = {
  name?: string;
  description?: string;
  venue?: string;
  hosts?: string;
  isPublic?: boolean;
  themeId?: string;
  standardThemeId?: string;
  year?: number;
  hostingCountryCode?: string;
  snapshot?: Record<string, any>;
  groupId?: string | null;
};

export type PublicContestsQueryParams = {
  page?: number;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves';
  sortOrder?: 'asc' | 'desc';
  year?: number;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
};

export type MyContestsListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves';
  sortOrder?: 'asc' | 'desc';
  year?: number;
  startDate?: string;
  endDate?: string;
  /** GET /contests/me only */
  groupId?: string;
  enabled?: boolean;
};

export type ContestGroup = ContestGroupSummary & {
  createdAt?: string;
  updatedAt?: string;
};

function buildMyContestsListQueryString(
  params: Omit<MyContestsListQueryParams, 'enabled'>,
) {
  const searchParams = new URLSearchParams();
  searchParams.append('page', (params.page ?? 1).toString());
  searchParams.append('limit', (params.limit ?? 10).toString());
  if (params.search) searchParams.append('q', params.search);
  searchParams.append('sortBy', params.sortBy ?? 'createdAt');
  searchParams.append('sortDir', params.sortOrder ?? 'desc');
  if (params.year != null) searchParams.append('year', String(params.year));
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.groupId) searchParams.append('groupId', params.groupId);
  return searchParams.toString();
}

export function useMyContestsListQuery({
  page = 1,
  limit = 10,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  year,
  startDate,
  endDate,
  groupId,
  enabled = true,
}: MyContestsListQueryParams) {
  const filters = {
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
    year,
    startDate,
    endDate,
    groupId,
  };
  return useQuery<ContestListResponse>({
    queryKey: queryKeys.user.contestsMeList(filters),
    queryFn: async () => {
      const qs = buildMyContestsListQueryString(filters);
      const { data } = await api.get(`/contests/me?${qs}`);
      return data as ContestListResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useSavedContestsListQuery({
  page = 1,
  limit = 10,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  year,
  startDate,
  endDate,
  enabled = true,
}: MyContestsListQueryParams) {
  const filters = {
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
    year,
    startDate,
    endDate,
  };
  return useQuery<ContestListResponse>({
    queryKey: queryKeys.user.savedContestsList(filters),
    queryFn: async () => {
      const qs = buildMyContestsListQueryString(filters);
      const { data } = await api.get(`/contests/me/saved?${qs}`);
      return data as ContestListResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useContestByIdQuery(contestId: string, enabled = true) {
  return useQuery<Contest>({
    queryKey: queryKeys.user.contestById(contestId),
    queryFn: async () => {
      const { data } = await api.get(`/contests/${contestId}`);

      return data as Contest;
    },
    enabled: enabled && !!contestId,
  });
}

export function useContestGroupsQuery(enabled = true) {
  return useQuery<ContestGroup[]>({
    queryKey: queryKeys.user.contestGroups(),
    queryFn: async () => {
      const { data } = await api.get('/contests/groups');
      return data as ContestGroup[];
    },
    enabled,
  });
}

export function useCreateContestGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data } = await api.post('/contests/groups', input);
      return data as ContestGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.contestGroups() });
    },
  });
}

export function useUpdateContestGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await api.patch(`/contests/groups/${id}`, { name });
      return data as ContestGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.contestGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.contests() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedContests() });
    },
  });
}

export function useDeleteContestGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contests/groups/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.contestGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.contests() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedContests() });
    },
  });
}

export function useApplyContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/contests/${id}/apply`);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

export function useClearActiveContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/contests/clear-active');

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

export function usePublicLeaderboardQuery(opts: {
  year?: number | 'global';
  enabled?: boolean;
}) {
  const year = opts.year ?? 'global';

  return useQuery<PublicLeaderboardResponse>({
    queryKey: queryKeys.public.leaderboard(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year !== 'global') params.set('year', String(year));
      const qs = params.toString();
      const { data } = await api.get(
        `/contests/leaderboard/public${qs ? `?${qs}` : ''}`,
      );

      return data as PublicLeaderboardResponse;
    },
    enabled: opts.enabled !== false,
    staleTime: 5 * 60_000,
  });
}

export function usePublicContestsQuery({
  page = 1,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  enabled = true,
}: PublicContestsQueryParams) {
  return useQuery<ContestListResponse>({
    queryKey: queryKeys.public.contests({
      page,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();

      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('q', search);
      params.append('sortBy', sortBy);
      params.append('sortDir', sortOrder);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { data } = await api.get(`/contests/public?${params.toString()}`);

      return data as ContestListResponse;
    },
    enabled,
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

export function useContestSnapshotQuery(id: string, enabled = true) {
  return useQuery<ContestSnapshot>({
    queryKey: ['contest', 'snapshot', id],
    queryFn: async () => {
      const { data } = await api.get(`/contests/${id}/snapshot`);

      return data as ContestSnapshot;
    },
    enabled: !!id && enabled,
  });
}

export function useMyEntryStatsQuery(entryCode: string | null, enabled = true) {
  const encoded = entryCode ? encodeURIComponent(entryCode) : '';

  return useQuery<EntryStatsResponse>({
    queryKey: queryKeys.user.entryStats(entryCode || ''),
    queryFn: async () => {
      const { data } = await api.get(`/contests/me/entry-stats/${encoded}`);

      return data as EntryStatsResponse;
    },
    enabled: !!entryCode && enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useCreateContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContestInput) => {
      const { data } = await api.post('/contests', input);

      return data as Contest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.contests() });
      qc.invalidateQueries({ queryKey: queryKeys.public.contests({}) });
    },
  });
}

export function useUpdateContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateContestInput & { id: string }) => {
      const { data } = await api.patch(`/contests/${id}`, input);

      return data as Contest;
    },
    onSuccess: (data, variables) => {
      if ((variables as any)?.id) {
        qc.setQueryData(
          queryKeys.user.contestById((variables as any).id),
          data,
        );
      }
      qc.invalidateQueries({ queryKey: queryKeys.user.contests() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedContests() });
      qc.invalidateQueries({ queryKey: queryKeys.public.contests({}) });
    },
  });
}

export function useDeleteContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contests/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.contests() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedContests() });
      qc.invalidateQueries({ queryKey: queryKeys.public.contests({}) });
    },
  });
}

export function useToggleLikeContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/contests/${id}/like`);

      return data as { liked: boolean; likes: number };
    },
    onSuccess: (res, id) => {
      const queries = qc.getQueriesData<ContestListResponse>({
        queryKey: ['public', 'contests'],
      });

      for (const [key, data] of queries) {
        if (!data) continue;
        qc.setQueryData(key, {
          ...data,
          contests: data.contests.map((c) =>
            c._id === id ? { ...c, likes: res.likes } : c,
          ),
        });
      }
      qc.invalidateQueries({ queryKey: ['user', 'contests-state'] });
      qc.invalidateQueries({ queryKey: queryKeys.user.contests() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedContests() });
    },
  });
}

export function useToggleSaveContestMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/contests/${id}/save`);

      return data as { saved: boolean; saves: number };
    },
    onSuccess: (res, id) => {
      const queries = qc.getQueriesData<ContestListResponse>({
        queryKey: ['public', 'contests'],
      });

      for (const [key, data] of queries) {
        if (!data) continue;
        qc.setQueryData(key, {
          ...data,
          contests: data.contests.map((c) =>
            c._id === id ? { ...c, saves: res.saves } : c,
          ),
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.user.savedContests() });
      qc.invalidateQueries({ queryKey: ['user', 'contests-state'] });
    },
  });
}

export function useContestsStateQuery(ids: string[], enabled = true) {
  return useQuery<ContestState>({
    queryKey: queryKeys.user.contestsState(ids),
    queryFn: async () => {
      const { data } = await api.get(`/contests/state?ids=${ids.join(',')}`);

      return data as ContestState;
    },
    enabled: enabled && ids.length > 0,
  });
}
