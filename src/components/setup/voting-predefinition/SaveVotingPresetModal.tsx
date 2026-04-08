'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';

export type SaveVotingPresetModalMode = 'create' | 'edit';

type SaveVotingPresetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: SaveVotingPresetModalMode;
  /** Shown when opening create flow */
  defaultName: string;
  /** When editing, initial name (overrides defaultName when set) */
  initialName?: string;
  onConfirm: (trimmedName: string) => void;
};

const INPUT_ID = 'voting-preset-name';

export const SaveVotingPresetModal: React.FC<SaveVotingPresetModalProps> = ({
  isOpen,
  onClose,
  mode,
  defaultName,
  initialName,
  onConfirm,
}) => {
  const t = useTranslations('setup.votingPredefinition.presets');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (mode === 'edit' && initialName !== undefined) {
      setName(initialName);
    } else {
      setName(defaultName);
    }
  }, [isOpen, mode, defaultName, initialName]);

  const title = mode === 'create' ? t('savePresetTitle') : t('editPresetTitle');

  const handleSave = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError(t('nameRequired'));

      return;
    }
    setError(null);
    onConfirm(trimmed);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1002]"
      contentClassName="!px-4 text-white flex flex-col gap-4 py-4"
      containerClassName="!w-[min(92%,420px)]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          saveButtonLabel="save"
        />
      }
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <InputField
        id={INPUT_ID}
        label={t('presetName')}
        placeholder={t('presetNamePlaceholder')}
        errors={
          error
            ? ({
                [INPUT_ID]: { type: 'required', message: error },
              } as any)
            : undefined
        }
        inputProps={{
          value: name,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
            if (error) setError(null);
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') handleSave();
          },
          autoComplete: 'off',
        }}
      />
    </Modal>
  );
};

export default SaveVotingPresetModal;
