import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type { CustomTheme } from '@/types/customTheme';
import type { Contest } from '@/types/contest';

export type UserContentItem =
  | { type: 'theme'; data: CustomTheme }
  | { type: 'contest'; data: Contest };

export interface UserContentResponse {
  items: UserContentItem[];
  total: number;
  page: number;
  totalPages: number;
}

export type UserContentType = 'all' | 'themes' | 'contests';

export type UserContentQueryParams = {
  page?: number;
  type?: UserContentType;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves' | 'duplicatesCount';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
};

export function useUserContentQuery(
  userId: string | undefined,
  {
    page = 1,
    type = 'all',
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDate,
    endDate,
    enabled = true,
  }: UserContentQueryParams,
) {
  return useQuery<UserContentResponse>({
    queryKey: queryKeys.public.userContent(userId ?? '', {
      page,
      type,
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
      params.append('type', type);
      if (search) params.append('search', search);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { data } = await api.get(
        `/profiles/${userId}/content?${params.toString()}`,
      );
      return data as UserContentResponse;
    },
    enabled: !!userId && enabled,
  });
}
