import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type {
  Contest,
  ContestListResponse,
  ContestState,
} from '@/types/contest';
import type { ContestSnapshot } from '@/types/contestSnapshot';

export type CreateContestInput = {
  name: string;
  description?: string;
  isPublic?: boolean;
  themeId?: string;
  year?: number;
  hostingCountryCode: string;
  snapshot: Record<string, any>;
};

export type UpdateContestInput = {
  name?: string;
  description?: string;
  isPublic?: boolean;
  themeId?: string;
  year?: number;
  hostingCountryCode?: string;
  snapshot?: Record<string, any>;
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

export function useMyContestsQuery(enabled: boolean = true) {
  return useQuery<Contest[]>({
    queryKey: queryKeys.user.contests(),
    queryFn: async () => {
      const { data } = await api.get('/contests/me');
      return data as Contest[];
    },
    enabled,
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

export function useSavedContestsQuery(enabled: boolean = true) {
  return useQuery<Contest[]>({
    queryKey: queryKeys.user.savedContests(),
    queryFn: async () => {
      const { data } = await api.get('/contests/me/saved');
      return data as Contest[];
    },
    enabled,
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

export function useContestByIdQuery(
  contestId: string,
  enabled: boolean = true,
) {
  return useQuery<Contest>({
    queryKey: queryKeys.user.contestById(contestId),
    queryFn: async () => {
      const { data } = await api.get(`/contests/${contestId}`);
      return data as Contest;
    },
    enabled: enabled && !!contestId,
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

export function useContestSnapshotQuery(id: string, enabled: boolean = true) {
  return useQuery<ContestSnapshot>({
    queryKey: ['contest', 'snapshot', id],
    queryFn: async () => {
      const { data } = await api.get(`/contests/${id}/snapshot`);
      return data as ContestSnapshot;
    },
    enabled: !!id && enabled,
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

export function useContestsStateQuery(ids: string[], enabled: boolean = true) {
  return useQuery<ContestState>({
    queryKey: queryKeys.user.contestsState(ids),
    queryFn: async () => {
      const { data } = await api.get(`/contests/state?ids=${ids.join(',')}`);
      return data as ContestState;
    },
    enabled: enabled && ids.length > 0,
  });
}
