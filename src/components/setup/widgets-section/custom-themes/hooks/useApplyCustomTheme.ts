import { api } from "@/api/client";
import { useApplyThemeMutation } from "@/api/themes";
import { useGeneralStore } from "@/state/generalStore";
import { useAuthStore } from "@/state/useAuthStore";
import { CustomTheme } from "@/types/customTheme";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";

export const useApplyCustomTheme = () => {
  const t = useTranslations();
  const user = useAuthStore((state) => state.user);
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const { mutateAsync: applyThemeToProfile } = useApplyThemeMutation();


  const handleApply = async (theme: CustomTheme | string) => {
    try {
      const id = typeof theme === 'string' ? theme : theme._id;
      // Fetch the latest version before applying
      const { data: latest } = await api.get(`/themes/${id}`);

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
