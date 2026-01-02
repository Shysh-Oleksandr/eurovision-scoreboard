import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Profile } from '@/types/profile';
import { useAuthStore } from '@/state/useAuthStore';

export type UpdateProfileInput = Partial<
  Pick<Profile, 'username' | 'name' | 'country' | 'preferredLocale'>
>;

export function useMeProfileQuery(enabled: boolean = true) {
  return useQuery<Profile | null>({
    queryKey: ['me-profile'],
    queryFn: async () => {
      const { data } = await api.get('/profiles/me');
      return data as Profile;
    },
    enabled,
  });
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
