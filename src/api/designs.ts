import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

import type { Design } from '@/graphics/model/design';
import type {
  CloudDesign,
  DesignListResponse,
  DesignSizeClass,
  DesignState,
} from '@/types/design';

export type DesignSortBy = 'createdAt' | 'likes' | 'saves' | 'duplicatesCount';

export interface DesignsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: DesignSortBy;
  sortOrder?: 'asc' | 'desc';
  sizeClass?: DesignSizeClass;
  hasScoreboard?: boolean;
  hasStats?: boolean;
  enabled?: boolean;
}

export interface CreateDesignInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  design: Design;
  /** Source design `_id` when this was remixed from another design (provenance). */
  remixedFrom?: string;
}

export interface UpdateDesignInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  design?: Design;
}

const buildQuery = (params: Omit<DesignsQueryParams, 'enabled'>) => {
  const q = new URLSearchParams();

  q.append('page', String(params.page ?? 1));
  q.append('limit', String(params.limit ?? 12));
  if (params.search) q.append('search', params.search);
  q.append('sortBy', params.sortBy ?? 'createdAt');
  q.append('sortOrder', params.sortOrder ?? 'desc');
  if (params.sizeClass) q.append('sizeClass', params.sizeClass);
  if (params.hasScoreboard) q.append('hasScoreboard', 'true');
  if (params.hasStats) q.append('hasStats', 'true');

  return q.toString();
};

const filtersOf = (params: DesignsQueryParams) => ({
  page: params.page ?? 1,
  limit: params.limit ?? 12,
  search: params.search || undefined,
  sortBy: params.sortBy ?? 'createdAt',
  sortOrder: params.sortOrder ?? 'desc',
  sizeClass: params.sizeClass,
  hasScoreboard: params.hasScoreboard,
  hasStats: params.hasStats,
});

export function usePublicDesignsQuery(params: DesignsQueryParams) {
  const filters = filtersOf(params);

  return useQuery<DesignListResponse>({
    queryKey: queryKeys.public.designs(filters),
    queryFn: async () => {
      const { data } = await api.get(`/designs/public?${buildQuery(filters)}`);

      return data as DesignListResponse;
    },
    enabled: params.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useMyDesignsQuery(params: DesignsQueryParams) {
  const filters = filtersOf(params);

  return useQuery<DesignListResponse>({
    queryKey: queryKeys.user.designsMeList(filters),
    queryFn: async () => {
      const { data } = await api.get(`/designs/me?${buildQuery(filters)}`);

      return data as DesignListResponse;
    },
    enabled: params.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useSavedDesignsQuery(params: DesignsQueryParams) {
  const filters = filtersOf(params);

  return useQuery<DesignListResponse>({
    queryKey: queryKeys.user.savedDesignsList(filters),
    queryFn: async () => {
      const { data } = await api.get(
        `/designs/me/saved?${buildQuery(filters)}`,
      );

      return data as DesignListResponse;
    },
    enabled: params.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useDesignsStateQuery(ids: string[], enabled = true) {
  return useQuery<DesignState>({
    queryKey: queryKeys.user.designsState(ids),
    queryFn: async () => {
      const { data } = await api.get(
        `/designs/state?ids=${encodeURIComponent(ids.join(','))}`,
      );

      return data as DesignState;
    },
    enabled: enabled && ids.length > 0,
  });
}

export async function fetchDesignById(id: string): Promise<CloudDesign> {
  const { data } = await api.get(`/designs/${id}`);

  return data as CloudDesign;
}

export async function createDesign(
  input: CreateDesignInput,
): Promise<CloudDesign> {
  const { data } = await api.post('/designs', input);

  return data as CloudDesign;
}

export async function updateDesign(
  id: string,
  input: UpdateDesignInput,
): Promise<CloudDesign> {
  const { data } = await api.patch(`/designs/${id}`, input);

  return data as CloudDesign;
}

export async function deleteDesign(id: string): Promise<void> {
  await api.delete(`/designs/${id}`);
}

export async function uploadDesignAsset(
  id: string,
  file: Blob,
  fileName: string,
): Promise<{ url: string; key: string }> {
  const form = new FormData();

  form.append('file', file, fileName);
  const { data } = await api.post(`/designs/${id}/assets`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data as { url: string; key: string };
}

export async function uploadDesignThumbnail(
  id: string,
  file: Blob,
): Promise<CloudDesign> {
  const form = new FormData();

  form.append('file', file, 'thumbnail.jpg');
  const { data } = await api.post(`/designs/${id}/thumbnail`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data as CloudDesign;
}

/** Invalidate every cloud-design list (mine, saved, public). */
export function useInvalidateDesigns() {
  const qc = useQueryClient();

  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.user.designs() });
    qc.invalidateQueries({ queryKey: queryKeys.user.savedDesigns() });
    qc.invalidateQueries({ queryKey: ['public', 'designs'] });
    qc.invalidateQueries({ queryKey: ['user', 'designs-state'] });
  };
}

const patchLists = (
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<CloudDesign>,
) => {
  const prefixes = [
    ['public', 'designs'],
    queryKeys.user.designs(),
    queryKeys.user.savedDesigns(),
  ];

  prefixes.forEach((queryKey) => {
    qc.getQueriesData<DesignListResponse>({ queryKey }).forEach(
      ([key, data]) => {
        if (!data?.designs) return;
        qc.setQueryData(key, {
          ...data,
          designs: data.designs.map((d) =>
            d._id === id ? { ...d, ...patch } : d,
          ),
        });
      },
    );
  });
};

export function useToggleLikeDesignMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/designs/${id}/like`);

      return data as { liked: boolean; likes: number };
    },
    onSuccess: (res, id) => {
      patchLists(qc, id, { likes: res.likes });
      qc.invalidateQueries({ queryKey: ['user', 'designs-state'] });
    },
  });
}

export function useToggleSaveDesignMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/designs/${id}/save`);

      return data as { saved: boolean; saves: number };
    },
    onSuccess: (res, id) => {
      patchLists(qc, id, { saves: res.saves });
      qc.invalidateQueries({ queryKey: queryKeys.user.savedDesigns() });
      qc.invalidateQueries({ queryKey: ['user', 'designs-state'] });
    },
  });
}

export function useReportDesignDuplicateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/designs/${id}/duplicate`);

      return data as { duplicatesCount: number };
    },
    onSuccess: (res, id) =>
      patchLists(qc, id, { duplicatesCount: res.duplicatesCount }),
  });
}

/** Flip a published design between public (listed in Explore) and private. */
export function useSetDesignVisibilityMutation() {
  const qc = useQueryClient();
  const invalidate = useInvalidateDesigns();

  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      updateDesign(id, { isPublic }),
    onSuccess: (record) => {
      patchLists(qc, record._id, { isPublic: record.isPublic });
      invalidate();
    },
  });
}

export function useDeleteDesignMutation() {
  const invalidate = useInvalidateDesigns();

  return useMutation({
    mutationFn: deleteDesign,
    onSuccess: invalidate,
  });
}
