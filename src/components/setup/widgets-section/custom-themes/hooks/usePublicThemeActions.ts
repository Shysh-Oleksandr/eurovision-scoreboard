import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

import { useApplyCustomTheme } from './useApplyCustomTheme';

import {
  useToggleLikeThemeMutation,
  useToggleSaveThemeMutation,
} from '@/api/themes';
import { useConfirmation } from '@/hooks/useConfirmation';

export function usePublicThemeActions() {
  const t = useTranslations();
  const { mutateAsync: toggleLike } = useToggleLikeThemeMutation();
  const { mutateAsync: toggleSave } = useToggleSaveThemeMutation();
  const { confirm } = useConfirmation();
  const handleApply = useApplyCustomTheme();

  const handleLike = async (id: string) => {
    try {
      const res = await toggleLike(id);
      toast.success(
        res.liked
          ? t('widgets.themes.themeLikedSuccessfully')
          : t('widgets.themes.themeUnlikedSuccessfully'),
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to like theme');
    }
  };

  const handleSave = async (id: string, savedByMe: boolean) => {
    try {
      if (savedByMe) {
        confirm({
          key: 'remove-saved-theme',
          title: t('widgets.themes.confirmRemoveSavedTheme'),
          onConfirm: async () => {
            const res = await toggleSave(id);
            toast.success(
              t(
                res.saved
                  ? 'widgets.themes.themeSavedSuccessfully'
                  : 'widgets.themes.themeRemovedFromSaved',
              ),
            );
          },
        });
      } else {
        const res = await toggleSave(id);
        toast.success(
          t(
            res.saved
              ? 'widgets.themes.themeSavedSuccessfully'
              : 'widgets.themes.themeRemovedFromSaved',
          ),
        );
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save theme');
    }
  };

  return { handleLike, handleSave, handleApply };
}
