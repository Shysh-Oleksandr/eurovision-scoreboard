import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'react-toastify';

import { useBlockUserMutation, useUnblockUserMutation } from '@/api/blocks';
import { useConfirmation } from '@/hooks/useConfirmation';

export interface BlockableUser {
  _id: string;
  username?: string;
  name?: string;
}

export const blockDisplayName = (user: BlockableUser) =>
  user.name || (user.username ? `@${user.username}` : '');

/** Block (after a confirmation) and unblock, with their toasts. */
export function useBlockActions() {
  const t = useTranslations('moderation');
  const { confirm } = useConfirmation();
  const { mutateAsync: block, isPending: isBlocking } = useBlockUserMutation();
  const { mutateAsync: unblock, isPending: isUnblocking } =
    useUnblockUserMutation();

  const blockUser = useCallback(
    (user: BlockableUser) => {
      const name = blockDisplayName(user);

      confirm({
        key: 'block-user',
        title: t('blockConfirmTitle', { name }),
        description: t('blockConfirmDescription'),
        type: 'danger',
        onConfirm: async () => {
          try {
            await block(user._id);
            toast.success(t('blocked', { name }));
          } catch {
            toast.error(t('blockFailed'));
          }
        },
      });
    },
    [block, confirm, t],
  );

  const unblockUser = useCallback(
    async (user: BlockableUser) => {
      try {
        await unblock(user._id);
        toast.success(t('unblocked', { name: blockDisplayName(user) }));
      } catch {
        toast.error(t('unblockFailed'));
      }
    },
    [unblock, t],
  );

  return { blockUser, unblockUser, isPending: isBlocking || isUnblocking };
}
