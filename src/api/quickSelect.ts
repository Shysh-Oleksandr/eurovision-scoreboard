import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { queryKeys } from './queryKeys';

export function useQuickSelectContestsQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.user.quickSelectContests(),
    queryFn: async () => {
      const { data } = await api.get('/contests/quick-select');
      return data as Array<{
        _id: string;
        name: string;
        year?: number;
        hostingCountryCode: string;
      }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useQuickSelectThemesQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.user.quickSelectThemes(),
    queryFn: async () => {
      const { data } = await api.get('/themes/quick-select');
      return data as Array<{
        _id: string;
        name: string;
        hue: number;
        shadeValue: number;
      }>;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useToggleContestQuickSelectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contestId: string) => {
      const { data } = await api.post(`/contests/${contestId}/quick-select`);
      return data as { selected: boolean };
    },
    onSuccess: () => {
      // Invalidate both the quick select list and state queries
      qc.invalidateQueries({ queryKey: queryKeys.user.quickSelectContests() });
      qc.invalidateQueries({ queryKey: ['contests', 'quick-select-state'] });
      qc.invalidateQueries({ queryKey: ['user', 'contests-state'] });
    },
  });
}

export function useToggleThemeQuickSelectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (themeId: string) => {
      const { data } = await api.post(`/themes/${themeId}/quick-select`);
      return data as { selected: boolean };
    },
    onSuccess: () => {
      // Invalidate both the quick select list and state queries
      qc.invalidateQueries({ queryKey: queryKeys.user.quickSelectThemes() });
      qc.invalidateQueries({ queryKey: ['themes', 'quick-select-state'] });
      qc.invalidateQueries({ queryKey: ['user', 'themes-state'] });
    },
  });
}
