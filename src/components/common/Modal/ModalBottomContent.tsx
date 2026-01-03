import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '../Button';

interface ModalBottomContentProps {
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  saveButtonLabel?: string;
}

const ModalBottomContent: React.FC<ModalBottomContentProps> = ({
  onClose,
  onSave,
  onDelete,
  isSaving,
  saveButtonLabel = 'save',
}) => {
  const t = useTranslations('common');

  return (
    <div
      className={`flex items-center xs:gap-4 gap-2 bg-primary-900 p-4 z-30 ${
        onDelete ? 'justify-between' : 'justify-end'
      }`}
    >
      {onDelete && (
        <Button
          className="sm:!text-base text-sm"
          variant="destructive"
          onClick={onDelete}
          snowEffect="left"
        >
          {t('delete')}
        </Button>
      )}
      <div
        className={`flex justify-end xs:gap-4 gap-2 ${
          !onDelete ? 'w-full' : ''
        }`}
      >
        <Button
          variant="secondary"
          className="sm:!text-base text-sm"
          onClick={onClose}
          snowEffect="middle"
        >
          {t('cancel')}
        </Button>
        <Button
          className="w-full sm:!text-base text-sm px-6 font-semibold"
          onClick={onSave}
          isLoading={isSaving}
          disabled={isSaving}
          snowEffect="right"
        >
          {t(saveButtonLabel)}
        </Button>
      </div>
    </div>
  );
};

export default ModalBottomContent;
