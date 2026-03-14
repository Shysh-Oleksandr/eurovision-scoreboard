import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';
import type { CustomEntry, CustomEntryGroup } from '@/types/customEntry';

export type CreateCustomEntryInput = {
  name: string;
  flagUrl: string;
  groupId?: string;
};

export type BulkCreateCustomEntriesInput = {
  entries: CreateCustomEntryInput[];
};

export type UpdateCustomEntryInput = {
  name?: string;
  flagUrl?: string;
  groupId?: string | null;
};

export type CreateCustomEntryGroupInput = {
  name: string;
};

export type UpdateCustomEntryGroupInput = {
  name?: string;
};

export type BulkAssignCustomEntryGroupInput = {
  groupId?: string | null;
  entryIds: string[];
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

export function useBulkCreateCustomEntriesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkCreateCustomEntriesInput) => {
      const { data } = await api.post('/custom-entries/bulk', input);
      return data as CustomEntry[];
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

export function useBulkDeleteCustomEntriesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.delete('/custom-entries/bulk', { data: { ids } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useCustomEntryGroupsQuery(enabled: boolean = true) {
  return useQuery<CustomEntryGroup[]>({
    queryKey: queryKeys.user.customEntryGroups(),
    queryFn: async () => {
      const { data } = await api.get('/custom-entries/groups');
      return data as CustomEntryGroup[];
    },
    enabled,
  });
}

export function useCreateCustomEntryGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomEntryGroupInput) => {
      const { data } = await api.post('/custom-entries/groups', input);
      return data as CustomEntryGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntryGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useUpdateCustomEntryGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateCustomEntryGroupInput & { id: string }) => {
      const { data } = await api.patch(`/custom-entries/groups/${id}`, input);
      return data as CustomEntryGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntryGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useDeleteCustomEntryGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/custom-entries/groups/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntryGroups() });
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntries() });
    },
  });
}

export function useBulkAssignCustomEntryGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkAssignCustomEntryGroupInput) => {
      await api.post('/custom-entries/groups/bulk-assign', input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.customEntryGroups() });
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
