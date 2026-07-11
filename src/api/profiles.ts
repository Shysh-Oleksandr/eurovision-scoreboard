import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

import type { UserPreferences } from '@/state/syncedSettings';
import { useAuthStore } from '@/state/useAuthStore';
import type { Profile } from '@/types/profile';

export type UpdateProfileInput = Partial<
  Pick<Profile, 'username' | 'name' | 'country' | 'preferredLocale'>
>;

export function useMyPreferencesQuery(enabled: boolean) {
  return useQuery<UserPreferences>({
    queryKey: queryKeys.user.preferences(),
    queryFn: async () => {
      const { data } = await api.get('/profiles/me/preferences');

      return (data ?? {}) as UserPreferences;
    },
    enabled,
  });
}

export function useUpdatePreferencesMutation() {
  return useMutation({
    mutationFn: async (input: UserPreferences) => {
      const { data } = await api.patch('/profiles/me/preferences', input);

      return data as UserPreferences;
    },
  });
}

export function useMeProfileQuery(enabled = true) {
  return useQuery<Profile | null>({
    queryKey: ['me-profile'],
    queryFn: async () => {
      const { data } = await api.get('/profiles/me');

      return data as Profile;
    },
    enabled,
  });
}

export function fetchProfileById(id: string) {
  return api.get<Profile>(`/profiles/${id}`);
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await api.patch(`/profiles/me`, input);

      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['me-profile'] });
      // Also update the auth store user immediately with the latest profile
      try {
        const { data } = await api.get('/profiles/me');

        useAuthStore.setState({ user: data as Profile });
      } catch (e) {
        console.error(e);
      }
    },
  });
}

export function useUploadProfileAvatarMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();

      formData.append('file', file);
      const { data } = await api.post('/profiles/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return data as Profile;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['me-profile'] });
      try {
        const { data } = await api.get('/profiles/me');

        useAuthStore.setState({ user: data as Profile });
      } catch (e) {
        console.error(e);
      }
    },
  });
}

export function useDeleteProfileAvatarMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/profiles/me/avatar');

      return data as Profile;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['me-profile'] });
      try {
        const { data } = await api.get('/profiles/me');

        useAuthStore.setState({ user: data as Profile });
      } catch (e) {
        console.error(e);
      }
    },
  });
}
