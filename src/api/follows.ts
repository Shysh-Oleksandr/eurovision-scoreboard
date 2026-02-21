import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type {
  UserContentItem,
  UserContentResponse,
  UserContentType,
} from './userContent';

export interface FollowingStatusResponse {
  isFollowing: boolean;
  followerCount: number;
}

export interface FollowerUser {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface FollowersResponse {
  items: FollowerUser[];
  total: number;
  page: number;
  totalPages: number;
}

export type FollowersQueryParams = {
  page?: number;
  search?: string;
  enabled?: boolean;
};

export function useFollowersQuery(
  userId: string | undefined,
  params: FollowersQueryParams = {},
) {
  const { page = 1, search, enabled = true } = params;

  return useQuery<FollowersResponse>({
    queryKey: queryKeys.follows.followers(userId ?? '', { page, search }),
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      urlParams.append('page', page.toString());
      urlParams.append('limit', '15');
      if (search) urlParams.append('search', search);

      const { data } = await api.get(
        `/profiles/${userId}/followers?${urlParams.toString()}`,
      );
      return data as FollowersResponse;
    },
    enabled: !!userId && enabled,
  });
}

export type FollowingFeedQueryParams = {
  page?: number;
  type?: UserContentType;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves' | 'duplicatesCount';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
};

export function useFollowingStatusQuery(userId: string | undefined) {
  return useQuery<FollowingStatusResponse>({
    queryKey: queryKeys.follows.status(userId ?? ''),
    queryFn: async () => {
      const { data } = await api.get(`/profiles/${userId}/following-status`);
      return data as FollowingStatusResponse;
    },
    enabled: !!userId,
  });
}

export function useFollowMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      await api.post(`/profiles/${targetId}/follow`);
    },
    onSuccess: (_, targetId) => {
      qc.invalidateQueries({ queryKey: queryKeys.follows.status(targetId) });
      qc.invalidateQueries({ queryKey: ['follows', 'following-feed'] });
      qc.invalidateQueries({
        queryKey: queryKeys.public.userContent(targetId, {}),
      });
      qc.invalidateQueries({
        queryKey: ['follows', 'followers', targetId],
      });
    },
  });
}

export function useUnfollowMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      await api.delete(`/profiles/${targetId}/follow`);
    },
    onSuccess: (_, targetId) => {
      qc.invalidateQueries({ queryKey: queryKeys.follows.status(targetId) });
      qc.invalidateQueries({ queryKey: ['follows', 'following-feed'] });
      qc.invalidateQueries({
        queryKey: queryKeys.public.userContent(targetId, {}),
      });
      qc.invalidateQueries({
        queryKey: ['follows', 'followers', targetId],
      });
    },
  });
}

export function useFollowingFeedQuery(
  params: FollowingFeedQueryParams & { enabled?: boolean } = {},
) {
  const {
    page = 1,
    type = 'all',
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDate,
    endDate,
    enabled = true,
  } = params;

  return useQuery<UserContentResponse>({
    queryKey: queryKeys.follows.followingFeed({
      page,
      type,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    }),
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      urlParams.append('page', page.toString());
      urlParams.append('limit', '10');
      urlParams.append('type', type);
      if (search) urlParams.append('search', search);
      urlParams.append('sortBy', sortBy);
      urlParams.append('sortOrder', sortOrder);
      if (startDate) urlParams.append('startDate', startDate);
      if (endDate) urlParams.append('endDate', endDate);

      const { data } = await api.get(
        `/profiles/me/following/feed?${urlParams.toString()}`,
      );
      return data as UserContentResponse;
    },
    enabled,
    refetchOnMount: 'always',
  });
}
