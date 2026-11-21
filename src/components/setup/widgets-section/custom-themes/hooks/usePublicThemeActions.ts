import { useTranslations } from 'next-intl';

import { useApplyCustomTheme } from './useApplyCustomTheme';

import {
  useToggleLikeThemeMutation,
  useToggleSaveThemeMutation,
} from '@/api/themes';
import { toast } from '@/helpers/toast';
import { useConfirmation } from '@/hooks/useConfirmation';

export function usePublicThemeActions() {
  const t = useTranslations();
  const { mutateAsync: toggleLike } = useToggleLikeThemeMutation();
  const { mutateAsync: toggleSave } = useToggleSaveThemeMutation();
  const { confirm } = useConfirmation();
  const handleApply = useApplyCustomTheme();

  const handleLike = async (id: string) => {
    try {
      // The thumb's own state confirms it.
      await toggleLike(id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('common.didntGoThrough'));
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
      toast.error(error?.response?.data?.message || t('common.didntGoThrough'));
    }
  };

  return { handleLike, handleSave, handleApply };
}
