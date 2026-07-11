import { useCallback } from 'react';

import { useConfirmation } from '@/hooks/useConfirmation';

type UseConfirmModalCloseOptions = {
  onClose: () => void;
  confirmKey: string;
  title: string;
  description?: string;
};

export function useConfirmModalClose({
  onClose,
  confirmKey,
  title,
  description,
}: UseConfirmModalCloseOptions) {
  const { confirm } = useConfirmation();

  const onClickOutside = useCallback(() => {
    confirm({
      key: confirmKey,
      type: 'alert',
      title,
      description,
      onConfirm: onClose,
    });
  }, [confirm, confirmKey, title, description, onClose]);

  return { onClickOutside };
}
