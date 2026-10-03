import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '../Button';

interface ModalBottomCloseButtonProps {
  onClose: () => void;
}

const ModalBottomCloseButton: React.FC<ModalBottomCloseButtonProps> = ({
  onClose,
}) => {
  const t = useTranslations('common');

  return (
    <div className="flex items-center bg-primary-900 px-3.5 pt-[10px] pb-[calc(10px+var(--modal-safe-bottom,0px))] 2cols:px-5 z-30">
      <Button
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={onClose}
        snowEffect="left"
      >
        {t('close')}
      </Button>
    </div>
  );
};

export default ModalBottomCloseButton;
