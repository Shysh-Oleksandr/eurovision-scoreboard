import { useTranslations } from 'next-intl';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, isNetworkError } from '@/api/client';
import { useApplyThemeMutation } from '@/api/themes';
import { toast } from '@/helpers/toast';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

const isTheme = (value: unknown, id: string): value is CustomTheme =>
  !!value &&
  typeof value === 'object' &&
  (value as CustomTheme)._id === id &&
  // A full theme, not a quick-select summary ({ _id, name, hue, … }).
  'baseThemeYear' in (value as object) &&
  'overrides' in (value as object);

/**
 * A full copy of theme `id` already in the query cache: a theme fetched by
 * id, or one in any loaded theme list (yours, saved, public, including the
 * copies kept on the device for offline launches).
 */
function findCachedTheme(client: QueryClient, id: string): CustomTheme | null {
  for (const [, data] of client.getQueriesData<unknown>({})) {
    if (isTheme(data, id)) return data;

    const themes = (data as { themes?: unknown[] } | undefined)?.themes;
    const match = Array.isArray(themes)
      ? themes.find((theme) => isTheme(theme, id))
      : undefined;

    if (match) return match as CustomTheme;
  }

  return null;
}

export const useApplyCustomTheme = () => {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const { mutateAsync: applyThemeToProfile } = useApplyThemeMutation();

  const handleApply = async (theme: CustomTheme | string) => {
    const id = typeof theme === 'string' ? theme : theme._id;

    try {
      let latest: CustomTheme;

      try {
        // Fetch the latest version before applying
        ({ data: latest } = await api.get(`/themes/${id}`));
      } catch (error) {
        // Offline: apply the copy on screen or in the cache. The account's
        // active theme isn't updated, as when signed out.
        const cached = isNetworkError(error)
          ? typeof theme === 'string'
            ? findCachedTheme(queryClient, id)
            : theme
          : null;

        if (!cached) throw error;

        applyCustomTheme(cached);
        toast.success(
          t('widgets.themes.themeAppliedSuccessfully', { name: cached.name }),
        );

        return;
      }

      // Apply locally (immediate)
      applyCustomTheme(latest);

      // Save to profile (sync across devices)
      if (user) {
        await applyThemeToProfile(id);
      }

      toast.success(
        t('widgets.themes.themeAppliedSuccessfully', { name: latest.name }),
      );
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || 'Failed to save theme to profile',
      );
    }
  };

  return handleApply;
};
