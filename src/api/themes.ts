import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type {
  BoardAnimationMode,
  CustomTheme,
  DouzePointsAnimationMode,
  ThemeGroupSummary,
  ThemeListResponse,
  ThemeState,
} from '@/types/customTheme';
import { FlagShape, PointsContainerShape } from '@/theme/types';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

export type CreateThemeInput = {
  name: string;
  description?: string;
  baseThemeYear?: string;
  hue: number;
  shadeValue?: number;
  overrides?: Record<string, string>;
  backgroundImageUrl?: string;
  isPublic?: boolean;
  pointsContainerShape?: PointsContainerShape;
  uppercaseEntryName?: boolean;
  juryActivePointsUnderline?: boolean;
  isJuryPointsPanelRounded?: boolean;
  flagShape?: FlagShape;
  usePointsCountUpAnimation?: boolean;
  boardAnimationMode?: BoardAnimationMode;
  douzePointsAnimationMode?: DouzePointsAnimationMode;
  themeSounds?: Record<string, { url: string; delayMs?: number } | null>;
  groupId?: string;
  fontAlias?: string;
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
  pointsContainerShape?: PointsContainerShape | null;
  uppercaseEntryName?: boolean | null;
  juryActivePointsUnderline?: boolean | null;
  isJuryPointsPanelRounded?: boolean | null;
  flagShape?: FlagShape | null;
  usePointsCountUpAnimation?: boolean | null;
  boardAnimationMode?: BoardAnimationMode | null;
  douzePointsAnimationMode?: DouzePointsAnimationMode | null;
  themeSounds?: Record<string, { url: string; delayMs?: number } | null>;
  groupId?: string | null;
  fontAlias?: string | null;
};

export type PublicThemesQueryParams = {
  page?: number;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves' | 'duplicatesCount';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  /** When true, only themes with custom audio (server flag). */
  hasCustomAudio?: boolean;
  enabled?: boolean;
};

export type MyThemesListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'likes' | 'saves' | 'duplicatesCount';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  hasCustomAudio?: boolean;
  /** Passed to GET /themes/me only */
  groupId?: string;
  enabled?: boolean;
};

export type ThemeGroup = ThemeGroupSummary & {
  createdAt?: string;
  updatedAt?: string;
};

function buildThemesListQueryParams(
  params: Omit<MyThemesListQueryParams, 'enabled'>,
) {
  const searchParams = new URLSearchParams();
  searchParams.append('page', (params.page ?? 1).toString());
  searchParams.append('limit', (params.limit ?? 10).toString());
  if (params.search) searchParams.append('search', params.search);
  searchParams.append('sortBy', params.sortBy ?? 'createdAt');
  searchParams.append('sortOrder', params.sortOrder ?? 'desc');
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.hasCustomAudio === true) {
    searchParams.append('hasCustomAudio', 'true');
  }
  if (params.groupId) searchParams.append('groupId', params.groupId);
  return searchParams.toString();
}

export function useMyThemesListQuery({
  page = 1,
  limit = 10,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  hasCustomAudio,
  groupId,
  enabled = true,
}: MyThemesListQueryParams) {
  const filters = {
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    hasCustomAudio,
    groupId,
  };
  return useQuery<ThemeListResponse>({
    queryKey: queryKeys.user.themesMeList(filters),
    queryFn: async () => {
      const qs = buildThemesListQueryParams(filters);
      const { data } = await api.get(`/themes/me?${qs}`);
      return data as ThemeListResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSavedThemesListQuery({
  page = 1,
  limit = 10,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  hasCustomAudio,
  enabled = true,
}: MyThemesListQueryParams) {
  const filters = {
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    hasCustomAudio,
  };
  return useQuery<ThemeListResponse>({
    queryKey: queryKeys.user.savedThemesList(filters),
    queryFn: async () => {
      const qs = buildThemesListQueryParams(filters);
      const { data } = await api.get(`/themes/me/saved?${qs}`);
      return data as ThemeListResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function usePublicThemesQuery({
  page = 1,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  hasCustomAudio,
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
      hasCustomAudio,
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
      if (hasCustomAudio === true) params.append('hasCustomAudio', 'true');

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

export function useThemeGroupsQuery(enabled = true) {
  return useQuery<ThemeGroup[]>({
    queryKey: queryKeys.user.themeGroups(),
    queryFn: async () => {
      const { data } = await api.get('/themes/groups');
      return data as ThemeGroup[];
    },
    enabled,
  });
}

export function useCreateThemeGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data } = await api.post('/themes/groups', input);
      return data as ThemeGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themeGroups() });
    },
  });
}

export function useUpdateThemeGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await api.patch(`/themes/groups/${id}`, { name });
      return data as ThemeGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themeGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
    },
  });
}

export function useDeleteThemeGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/themes/groups/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themeGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
    },
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
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
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
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
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
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
    },
  });
}

export function useUploadThemeSoundMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      eventId,
      file,
    }: {
      id: string;
      eventId: ThemeSoundEventId;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(
        `/themes/${id}/sounds/${eventId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return data as CustomTheme;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
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
      qc.invalidateQueries({ queryKey: queryKeys.user.themes() });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
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

      const userListQueries = qc.getQueriesData<ThemeListResponse>({
        queryKey: queryKeys.user.themes(),
      });
      for (const [key, data] of userListQueries) {
        if (!data?.themes) continue;
        const updated = {
          ...data,
          themes: data.themes.map((t) =>
            t._id === id ? { ...t, duplicatesCount: res.duplicatesCount } : t,
          ),
        };
        qc.setQueryData(key, updated);
      }

      const savedListQueries = qc.getQueriesData<ThemeListResponse>({
        queryKey: queryKeys.user.savedThemes(),
      });
      for (const [key, data] of savedListQueries) {
        if (!data?.themes) continue;
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
