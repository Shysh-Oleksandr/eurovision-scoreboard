import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Profile } from '@/types/profile';
import { useAuthStore } from '@/state/useAuthStore';

export type UpdateProfileInput = {
  username?: string;
  name?: string;
  country?: string;
};

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
