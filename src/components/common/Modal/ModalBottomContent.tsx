import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '../Button';

interface ModalBottomContentProps {
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
  saveButtonLabel?: string;
  saveButtonText?: string;
  saveButtonIcon?: React.ReactNode;
  saveButtonDisabled?: boolean;
}

const ModalBottomContent: React.FC<ModalBottomContentProps> = ({
  onClose,
  onSave,
  onDelete,
  isSaving,
  saveButtonLabel = 'save',
  saveButtonText,
  saveButtonIcon,
  saveButtonDisabled,
}) => {
  const t = useTranslations('common');

  return (
    <div className="flex items-center gap-2.5 bg-primary-900 px-3.5 pt-[10px] pb-[calc(10px+var(--modal-safe-bottom,0px))] 2cols:px-5 z-30">
      {onDelete && (
        <Button
          variant="destructive"
          size="lg"
          onClick={onDelete}
          snowEffect="left"
          Icon={<Trash2 className="size-[18px]" />}
        >
          <span className="xs:block hidden">{t('delete')}</span>
        </Button>
      )}
      <div className="flex flex-1 min-w-0 justify-end gap-2.5">
        <Button
          variant="ghost"
          size="lg"
          className="px-[18px]"
          onClick={onClose}
          snowEffect="middle"
        >
          {t('cancel')}
        </Button>
        <Button
          variant="cta"
          size="lg"
          className="flex-1 min-w-0 justify-center gap-2 !uppercase !font-bold"
          onClick={onSave}
          isLoading={isSaving}
          disabled={isSaving || saveButtonDisabled}
          snowEffect="right"
          Icon={saveButtonIcon}
        >
          {saveButtonText ?? t(saveButtonLabel)}
        </Button>
      </div>
    </div>
  );
};

export default ModalBottomContent;
