import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type {
  CustomTheme,
  ThemeListResponse,
  ThemeState,
} from '@/types/customTheme';

export type CreateThemeInput = {
  name: string;
  description?: string;
  baseThemeYear?: string;
  hue: number;
  shadeValue?: number;
  overrides?: Record<string, string>;
  backgroundImageUrl?: string;
  isPublic?: boolean;
};

export type UpdateThemeInput = {
  name?: string;
  description?: string;
  baseThemeYear?: string;
  hue?: number;
  shadeValue?: number;
  overrides?: Record<string, string>;
  backgroundImageUrl?: string;
  isPublic?: boolean;
};

export type PublicThemesQueryParams = {
  page?: number;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves' | 'duplicatesCount';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
};

export function useMyThemesQuery(enabled: boolean = true) {
  return useQuery<CustomTheme[]>({
    queryKey: queryKeys.user.themes(),
    queryFn: async () => {
      const { data } = await api.get('/themes/me');
      return data as CustomTheme[];
    },
    enabled,
  });
}

export function usePublicThemesQuery({
  page = 1,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  enabled = true,
}: PublicThemesQueryParams) {
  return useQuery<ThemeListResponse>({
    queryKey: queryKeys.public.themes({
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
      if (search) params.append('search', search);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { data } = await api.get(`/themes/public?${params.toString()}`);
      return data as ThemeListResponse;
    },
    enabled,
  });
}

export function useThemeByIdQuery(id: string, enabled: boolean = true) {
  return useQuery<CustomTheme>({
    queryKey: queryKeys.user.themeById(id),
    queryFn: async () => {
      const { data } = await api.get(`/themes/${id}`);
      return data as CustomTheme;
    },
    enabled: !!id && enabled,
  });
}

export function useCreateThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateThemeInput) => {
      const { data } = await api.post('/themes', input);
      return data as CustomTheme;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
    },
  });
}

export function useUpdateThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateThemeInput & { id: string }) => {
      const { data } = await api.patch(`/themes/${id}`, input);
      return data as CustomTheme;
    },
    onSuccess: (data, variables) => {
      // Update specific theme cache and invalidate lists
      if ((variables as any)?.id) {
        qc.setQueryData(queryKeys.user.themeById((variables as any).id), data);
      }
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
    },
  });
}

export function useDeleteThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/themes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
    },
  });
}

export function useUploadThemeBackgroundMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/themes/${id}/background`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as CustomTheme;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
    },
  });
}

export function useLikeThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/themes/${id}/like`);
      return data as { liked: boolean; likes: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.public.themes({}) });
    },
  });
}

export function useToggleLikeThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/themes/${id}/like`);
      return data as { liked: boolean; likes: number };
    },
    onSuccess: (res, id) => {
      // Update counts in all cached public theme lists without refetching
      const queries = qc.getQueriesData<ThemeListResponse>({
        queryKey: ['public', 'themes'],
      });
      for (const [key, data] of queries) {
        if (!data) continue;
        const updated = {
          ...data,
          themes: data.themes.map((t) =>
            t._id === id ? { ...t, likes: res.likes } : t,
          ),
        };
        qc.setQueryData(key, updated);
      }

      // Refresh user-specific like/save state (small payload)
      qc.invalidateQueries({ queryKey: ['user', 'themes-state'] });
    },
  });
}

export function useToggleSaveThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/themes/${id}/save`);
      return data as { saved: boolean; saves: number };
    },
    onSuccess: (res, id) => {
      // Update counts in all cached public theme lists without refetching
      const queries = qc.getQueriesData<ThemeListResponse>({
        queryKey: ['public', 'themes'],
      });
      for (const [key, data] of queries) {
        if (!data) continue;
        const updated = {
          ...data,
          themes: data.themes.map((t) =>
            t._id === id ? { ...t, saves: res.saves } : t,
          ),
        };
        qc.setQueryData(key, updated);
      }

      // Update saved list and state; this won't shift public list
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
      qc.invalidateQueries({ queryKey: ['user', 'themes-state'] });
    },
  });
}

export function useSavedThemesQuery(enabled: boolean = true) {
  return useQuery<CustomTheme[]>({
    queryKey: queryKeys.user.savedThemes(),
    queryFn: async () => {
      const { data } = await api.get('/themes/me/saved');
      return data as CustomTheme[];
    },
    enabled,
  });
}

export function useThemesStateQuery(ids: string[], enabled: boolean = true) {
  return useQuery<ThemeState>({
    queryKey: queryKeys.user.themesState(ids),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('ids', ids.join(','));
      const { data } = await api.get(`/themes/state?${params.toString()}`);
      return data as ThemeState;
    },
    enabled: enabled && ids.length > 0,
  });
}

export function useReportThemeDuplicateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (originalId: string) => {
      const { data } = await api.post(`/themes/${originalId}/duplicate`);
      return data as { duplicatesCount: number };
    },
    onSuccess: (res, id) => {
      const queries = qc.getQueriesData<ThemeListResponse>({
        queryKey: ['public', 'themes'],
      });
      for (const [key, data] of queries) {
        if (!data) continue;
        const updated = {
          ...data,
          themes: data.themes.map((t) =>
            t._id === id ? { ...t, duplicatesCount: res.duplicatesCount } : t,
          ),
        };
        qc.setQueryData(key, updated);
      }
    },
  });
}

export function useApplyThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/themes/${id}/apply`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}

export function useClearActiveThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/themes/clear-active');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });
}
