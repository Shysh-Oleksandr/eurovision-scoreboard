import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type { CustomEntry } from '@/types/customEntry';

export type CreateCustomEntryInput = {
  name: string;
  flagUrl: string;
};

export type UpdateCustomEntryInput = {
  name?: string;
  flagUrl?: string;
};

export function useMyCustomEntriesQuery(enabled: boolean = true) {
  return useQuery<CustomEntry[]>({
    queryKey: queryKeys.user.customEntries(),
    queryFn: async () => {
      const { data } = await api.get('/custom-entries/me');
      return data as CustomEntry[];
    },
    enabled,
  });
}

export function useCreateCustomEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomEntryInput) => {
      const { data } = await api.post('/custom-entries', input);
      return data as CustomEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useUpdateCustomEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateCustomEntryInput & { id: string }) => {
      const { data } = await api.patch(`/custom-entries/${id}`, input);
      return data as CustomEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useDeleteCustomEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/custom-entries/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useUploadCustomEntryFlagMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/custom-entries/${id}/flag`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as CustomEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}
