import { useTranslations } from 'next-intl';

import {
  useToggleLikeContestMutation,
  useToggleSaveContestMutation,
} from '@/api/contests';
import { toast } from '@/helpers/toast';
import { useConfirmation } from '@/hooks/useConfirmation';

export function usePublicContestActions() {
  const t = useTranslations();
  const { mutateAsync: toggleLike } = useToggleLikeContestMutation();
  const { mutateAsync: toggleSave } = useToggleSaveContestMutation();
  const { confirm } = useConfirmation();

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
      toast.error(error?.response?.data?.message || t('common.didntGoThrough'));
    }
  };

  return { handleLike, handleSave };
}
