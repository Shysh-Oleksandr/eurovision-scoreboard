import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

export type ErrorData = {
  _id: string;
  message: string;
  stack?: string;
  userDetails?: Record<string, any>;
  generalInfo?: Record<string, any>;
  countriesInfo?: Record<string, any>;
  scoreboardInfo?: Record<string, any>;
  userId?: string;
  isFixed?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateErrorInput = {
  message: string;
  stack?: string;
  userDetails?: Record<string, any>;
  generalInfo?: Record<string, any>;
  countriesInfo?: Record<string, any>;
  scoreboardInfo?: Record<string, any>;
};

export type QueryErrorsParams = {
  page?: number;
  limit?: number;
  message?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  isFixed?: boolean;
  sortBy?: 'createdAt' | 'message';
  sortOrder?: 'asc' | 'desc';
};

export type ErrorsResponse = {
  data: ErrorData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function useCreateErrorMutation() {
  return useMutation({
    mutationFn: async (input: CreateErrorInput) => {
      const { data } = await api.post('/errors', input);
      return data as ErrorData;
    },
  });
}

export function useErrorsQuery(
  params: QueryErrorsParams,
  enabled: boolean = true,
) {
  return useQuery<ErrorsResponse>({
    queryKey: queryKeys.errors.list(params),
    queryFn: async () => {
      const { data } = await api.get('/errors', { params });
      return data as ErrorsResponse;
    },
    enabled,
  });
}

export function useErrorQuery(id: string, enabled: boolean = true) {
  return useQuery<ErrorData>({
    queryKey: queryKeys.errors.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`/errors/${id}`);
      return data as ErrorData;
    },
    enabled: enabled && !!id,
  });
}

export function useUpdateErrorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; isFixed?: boolean }) => {
      const { data: result } = await api.patch(`/errors/${id}`, data);
      return result as ErrorData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.errors.all() });
    },
  });
}

export function useBulkUpdateErrorsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      data,
    }: {
      ids: string[];
      data: { isFixed?: boolean };
    }) => {
      await api.patch('/errors/bulk/update', { ids, data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.errors.all() });
    },
  });
}

export function useDeleteErrorMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/errors/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.errors.all() });
    },
  });
}

export function useBulkDeleteErrorsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.delete('/errors/bulk/delete', { data: { ids } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.errors.all() });
    },
  });
}
