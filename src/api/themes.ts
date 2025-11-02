import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type { CustomTheme, ThemeListResponse } from '@/types/customTheme';

export type CreateThemeInput = {
  name: string;
  description?: string;
  baseThemeYear?: string;
  hue: number;
  overrides?: Record<string, string>;
  backgroundImageUrl?: string;
  isPublic?: boolean;
};

export type UpdateThemeInput = {
  name?: string;
  description?: string;
  baseThemeYear?: string;
  hue?: number;
  overrides?: Record<string, string>;
  backgroundImageUrl?: string;
  isPublic?: boolean;
};

export type PublicThemesQueryParams = {
  page?: number;
  search?: string;
  sortBy?: 'createdAt' | 'likes';
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
  enabled = true,
}: PublicThemesQueryParams) {
  return useQuery<ThemeListResponse>({
    queryKey: queryKeys.public.themes({ page, search, sortBy }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      params.append('sortBy', sortBy);
      params.append('sortOrder', 'desc');

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
      return data as CustomTheme;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.public.themes({}) });
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
