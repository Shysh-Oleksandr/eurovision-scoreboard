import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

export interface SearchedUser {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface UsersSearchResponse {
  items: SearchedUser[];
  total: number;
  page: number;
  totalPages: number;
}

export type UsersSearchQueryParams = {
  page?: number;
  search?: string;
  enabled?: boolean;
};

export function useUsersSearchQuery(params: UsersSearchQueryParams = {}) {
  const { page = 1, search, enabled = true } = params;
  const trimmedSearch = search?.trim();

  return useQuery<UsersSearchResponse>({
    queryKey: queryKeys.users.search({ page, search: trimmedSearch }),
    queryFn: async () => {
      const urlParams = new URLSearchParams();

      urlParams.append('page', page.toString());
      urlParams.append('limit', '15');
      if (trimmedSearch) urlParams.append('search', trimmedSearch);

      const { data } = await api.get(
        `/profiles/search?${urlParams.toString()}`,
      );

      return data as UsersSearchResponse;
    },
    enabled: enabled && !!trimmedSearch,
  });
}
