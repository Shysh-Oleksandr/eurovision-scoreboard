import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

/**
 * A flag the user uploaded for a contest's own country flag (an entry
 * override, docs/entry-overrides.md §6). Kept until the account is deleted;
 * the same image uploaded twice is one flag.
 */
export interface EntryFlag {
  _id: string;
  url: string;
  createdAt: string;
}

export function useEntryFlagsQuery(enabled = true) {
  return useQuery<EntryFlag[]>({
    queryKey: queryKeys.user.entryFlags(),
    queryFn: async () => {
      const { data } = await api.get('/entry-flags/me');

      return data as EntryFlag[];
    },
    enabled,
  });
}

export function useUploadEntryFlagMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();

      formData.append('file', file);
      const { data } = await api.post('/entry-flags', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return data as EntryFlag;
    },
    onSuccess: (flag) => {
      // Newest first, once: uploading an image again returns the same flag.
      qc.setQueryData<EntryFlag[]>(queryKeys.user.entryFlags(), (current) => [
        flag,
        ...(current ?? []).filter((other) => other._id !== flag._id),
      ]);
    },
  });
}
