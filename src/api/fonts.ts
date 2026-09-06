import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api, type UploadProgress } from './client';
import { queryKeys } from './queryKeys';

import { useGeneralStore } from '@/state/generalStore';
import type { CustomTheme } from '@/types/customTheme';
import type {
  Font,
  FontListResponse,
  FontUploadResponse,
  FontWeightSlot,
  ThemeFontSnapshot,
} from '@/types/font';

/** Mirrors the backend limits in douze-points-backend/src/fonts/fonts.constants.ts. */
export const FONT_ACCEPTED_EXTENSIONS = [
  'woff2',
  'woff',
  'ttf',
  'otf',
] as const;
export const FONT_ACCEPT_ATTR = '.woff2,.woff,.ttf,.otf';
export const FONT_MAX_FILE_MB = 4;
export const FONT_MAX_FILE_BYTES = FONT_MAX_FILE_MB * 1024 * 1024;
export const FONT_MAX_FILES = 4;
export const FONT_MAX_PER_USER = 50;
export const FONT_WEIGHT_SLOTS: FontWeightSlot[] = [400, 500, 600, 700];

/** The shape a theme carries for a font (what the picker hands to the editor). */
export const fontToSnapshot = (font: Font): ThemeFontSnapshot => ({
  _id: font._id,
  name: font.name,
  isVariable: font.isVariable,
  faces: font.faces.map((f) => ({
    url: f.url,
    format: f.format,
    weight: f.weight,
    weightRange: f.weightRange,
  })),
});

export type FontsListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'name' | 'forksCount';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
};

function buildFontsListQueryParams(
  params: Omit<FontsListQueryParams, 'enabled'>,
) {
  const searchParams = new URLSearchParams();

  searchParams.append('page', (params.page ?? 1).toString());
  searchParams.append('limit', (params.limit ?? 12).toString());
  if (params.search) searchParams.append('search', params.search);
  searchParams.append('sortBy', params.sortBy ?? 'createdAt');
  searchParams.append('sortOrder', params.sortOrder ?? 'desc');
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);

  return searchParams.toString();
}

export function useMyFontsQuery({
  page = 1,
  limit = 12,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  enabled = true,
}: FontsListQueryParams) {
  const filters = {
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
  };

  return useQuery<FontListResponse>({
    queryKey: queryKeys.user.fontsMeList(filters),
    queryFn: async () => {
      const { data } = await api.get(
        `/fonts/me?${buildFontsListQueryParams(filters)}`,
      );

      return data as FontListResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
    // The picker tabs unmount while a font is uploaded/forked, so the global
    // refetchOnMount:false would keep showing the pre-upload list.
    refetchOnMount: true,
  });
}

export function usePublicFontsQuery({
  page = 1,
  limit = 12,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  startDate,
  endDate,
  enabled = true,
}: FontsListQueryParams) {
  const filters = {
    page,
    limit,
    search: search || undefined,
    sortBy,
    sortOrder,
    startDate,
    endDate,
  };

  return useQuery<FontListResponse>({
    queryKey: queryKeys.public.fonts(filters),
    queryFn: async () => {
      const { data } = await api.get(
        `/fonts/public?${buildFontsListQueryParams(filters)}`,
      );

      return data as FontListResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchOnMount: true,
  });
}

export function useFontByIdQuery(id: string, enabled = true) {
  return useQuery<Font>({
    queryKey: queryKeys.user.fontById(id),
    queryFn: async () => {
      const { data } = await api.get(`/fonts/${id}`);

      return data as Font;
    },
    enabled: enabled && !!id,
  });
}

/** Theme lists carry font snapshots, so anything that changes a font must refresh them too. */
function invalidateFontConsumers(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.user.fonts() });
  queryClient.invalidateQueries({ queryKey: queryKeys.user.themes() });
  queryClient.invalidateQueries({ queryKey: queryKeys.user.savedThemes() });
  queryClient.invalidateQueries({ queryKey: ['public', 'themes'] });
  queryClient.invalidateQueries({ queryKey: ['public', 'fonts'] });
}

/**
 * The applied theme lives in the general store (and localStorage) with its
 * font snapshots baked in; re-fetch it when one of its fonts changed so the
 * document renders the current faces (or falls back after a delete).
 */
async function refreshActiveThemeIfUsesFont(fontId: string) {
  const { customTheme, applyCustomTheme } = useGeneralStore.getState();

  if (!customTheme) return;
  if (
    customTheme.fontId !== fontId &&
    customTheme.scoreboardFontId !== fontId
  ) {
    return;
  }

  try {
    const { data } = await api.get<CustomTheme>(`/themes/${customTheme._id}`);

    applyCustomTheme(data);
  } catch (error) {
    console.error(
      'Failed to refresh the active theme after a font change:',
      error,
    );
  }
}

export type UploadFontInput = {
  files: File[];
  name?: string;
  /** Defaults to true: uploads are listed in the public library unless made private later. */
  isPublic?: boolean;
  onUploadProgress?: (progress: UploadProgress) => void;
};

export function useUploadFontMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      name,
      isPublic = true,
      onUploadProgress,
    }: UploadFontInput) => {
      const formData = new FormData();

      for (const file of files) formData.append('files', file);
      if (name) formData.append('name', name);
      formData.append('isPublic', String(isPublic));
      // Publishing requires the licence acknowledgement; the upload tab states it.
      if (isPublic) formData.append('licenseAccepted', 'true');

      const { data } = await api.upload<FontUploadResponse>(
        '/fonts',
        formData,
        {
          onUploadProgress,
        },
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.fonts() });
    },
  });
}

export type UpdateFontInput = {
  id: string;
  name?: string;
  isPublic?: boolean;
  /** Must be true when flipping `isPublic` on. */
  licenseAccepted?: boolean;
  weights?: Array<{ sha256: string; weight: FontWeightSlot }>;
};

export function useUpdateFontMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateFontInput) => {
      const { data } = await api.patch<Font>(`/fonts/${id}`, body);

      return data;
    },
    onSuccess: (font) => {
      invalidateFontConsumers(queryClient);
      void refreshActiveThemeIfUsesFont(font._id);
    },
  });
}

export type DeleteFontInput = { id: string; force?: boolean };

export function useDeleteFontMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, force }: DeleteFontInput) => {
      await api.delete(`/fonts/${id}${force ? '?force=true' : ''}`);

      return id;
    },
    onSuccess: (id) => {
      invalidateFontConsumers(queryClient);
      void refreshActiveThemeIfUsesFont(id);
    },
  });
}

/** "Add to my library" — idempotent on the server. */
export function useForkFontMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Font>(`/fonts/${id}/fork`);

      return data;
    },
    onSuccess: (fork) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.fonts() });
      queryClient.setQueriesData<FontListResponse>(
        { queryKey: ['public', 'fonts'] },
        (old) =>
          old
            ? {
                ...old,
                fonts: old.fonts.map((f) =>
                  f._id === fork.forkedFrom
                    ? {
                        ...f,
                        forkedByMe: true,
                        forksCount: f.forkedByMe
                          ? f.forksCount
                          : f.forksCount + 1,
                      }
                    : f,
                ),
              }
            : old,
      );
    },
  });
}

export type AddFontFileInput = {
  id: string;
  file: File;
  onUploadProgress?: (progress: UploadProgress) => void;
};

export function useAddFontFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file, onUploadProgress }: AddFontFileInput) => {
      const formData = new FormData();

      formData.append('file', file);

      const { data } = await api.upload<FontUploadResponse>(
        `/fonts/${id}/files`,
        formData,
        { onUploadProgress },
      );

      return data;
    },
    onSuccess: ({ font }) => {
      invalidateFontConsumers(queryClient);
      void refreshActiveThemeIfUsesFont(font._id);
    },
  });
}

export type RemoveFontFileInput = { id: string; weight: FontWeightSlot };

export function useRemoveFontFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, weight }: RemoveFontFileInput) => {
      const { data } = await api.delete<Font>(`/fonts/${id}/files/${weight}`);

      return data;
    },
    onSuccess: (font) => {
      invalidateFontConsumers(queryClient);
      void refreshActiveThemeIfUsesFont(font._id);
    },
  });
}
