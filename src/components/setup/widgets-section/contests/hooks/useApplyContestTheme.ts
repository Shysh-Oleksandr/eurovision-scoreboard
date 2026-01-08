'use client';

import { api } from '@/api/client';
import { useApplyThemeMutation } from '@/api/themes';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';

export const useApplyContestTheme = () => {
  const { mutateAsync: applyThemeToProfile } = useApplyThemeMutation();
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const setTheme = useGeneralStore((state) => state.setTheme);
  const user = useAuthStore((state) => state.user);

  const applyTheme = async (themeId?: string, standardThemeId?: string) => {
    if (themeId || standardThemeId) {
      try {
        if (themeId) {
          const { data: theme } = await api.get(`/themes/${themeId}`);

          // Apply locally (immediate)
          applyCustomTheme(theme);

          // Save to profile (sync across devices)
          if (user) {
            await applyThemeToProfile(theme._id);
          }
        } else if (standardThemeId) {
          setTheme(standardThemeId);
        }
      } catch (error: any) {
        toastAxiosError(error, 'Failed to apply theme');
      }
    }
  };

  return applyTheme;
};
