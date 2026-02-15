import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

import {
  useToggleLikeContestMutation,
  useToggleSaveContestMutation,
} from '@/api/contests';
import { useConfirmation } from '@/hooks/useConfirmation';

export function usePublicContestActions() {
  const t = useTranslations();
  const { mutateAsync: toggleLike } = useToggleLikeContestMutation();
  const { mutateAsync: toggleSave } = useToggleSaveContestMutation();
  const { confirm } = useConfirmation();

  const handleLike = async (id: string) => {
    try {
      const res = await toggleLike(id);
      toast.success(
        res.liked
          ? 'Contest liked successfully'
          : 'Contest unliked successfully',
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to like contest');
    }
  };

  const handleSave = async (id: string, savedByMe: boolean) => {
    try {
      if (savedByMe) {
        confirm({
          key: 'remove-saved-contest',
          title: t('widgets.contests.confirmRemoveSavedContest'),
          onConfirm: async () => {
            const res = await toggleSave(id);
            toast.success(
              t(
                res.saved
                  ? 'widgets.contests.contestSavedSuccessfully'
                  : 'widgets.contests.contestRemovedFromSaved',
              ),
            );
          },
        });
      } else {
        const res = await toggleSave(id);
        toast.success(
          t(
            res.saved
              ? 'widgets.contests.contestSavedSuccessfully'
              : 'widgets.contests.contestRemovedFromSaved',
          ),
        );
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save contest');
    }
  };

  return { handleLike, handleSave };
}
