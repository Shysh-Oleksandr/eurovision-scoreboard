import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { Checkbox } from '../Checkbox';

import { CircleExclamationMark } from '@/assets/icons/CircleExclamationMark';
import { ShieldAlert } from '@/assets/icons/ShieldAlert';
import { TriangleAlertIcon } from '@/assets/icons/TriangleAlertIcon';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { useConfirmationStore } from '@/state/confirmationStore';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontShowAgainChecked: boolean) => void;
  title: string;
  description?: string;
  confirmationKey?: string;
  type?: 'alert' | 'info' | 'danger';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmationKey,
  type = 'alert',
}) => {
  const { preferences } = useConfirmationStore();
  const t = useTranslations();

  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  const Icon = useMemo(() => {
    if (type === 'alert')
      return <TriangleAlertIcon className="size-12 text-yellow-500" />;
    if (type === 'info')
      return <CircleExclamationMark className="size-12 text-white" />;
    if (type === 'danger')
      return <ShieldAlert className="size-12 text-red-600" />;

    return null;
  }, [type]);

  // Load the saved preference when modal opens
  useEffect(() => {
    if (isOpen && confirmationKey) {
      const savedPreference = preferences[confirmationKey];

      setDoNotShowAgain(savedPreference?.dontShowAgain || false);
    }
  }, [isOpen, confirmationKey, preferences]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1002]"
      containerClassName="!w-[min(90%,450px)]"
      withBlur
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={() => onConfirm(doNotShowAgain)}
          saveButtonLabel="confirm"
        />
      }
    >
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center bg-white/10 rounded-full mx-auto p-4 size-20 pb-4">
          {Icon}
        </div>
        <div className="text-2xl font-semibold">{title}</div>
        {description && (
          <div className="text-white/80 leading-6">{description}</div>
        )}

        <Checkbox
          id="confirmation"
          label={t('common.dontShowAgain')}
          checked={doNotShowAgain}
          onChange={(e) => setDoNotShowAgain(e.target.checked)}
        />
      </div>
    </Modal>
  );
};
