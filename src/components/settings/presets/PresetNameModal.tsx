import React, { useEffect, useState } from 'react';

import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { Input } from '@/components/Input';

interface PresetNameModalProps {
  isOpen: boolean;
  initialName?: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | null;
  title: string;
}

export const PresetNameModal: React.FC<PresetNameModalProps> = ({
  isOpen,
  initialName = '',
  onClose,
  onSave,
  onDelete,
  title,
}) => {
  const [name, setName] = useState(initialName ?? '');

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

  const handleSave = async () => {
    if (!name.trim()) return;

    await onSave(name.trim());
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Delete this preset permanently?')) return;

    await onDelete();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(90%,500px)]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          onDelete={onDelete ? handleDelete : undefined}
        />
      }
    >
      <div className="space-y-4 text-white">
        <div className="text-xl font-semibold">{title}</div>
        <div className="space-y-2">
          <label className="text-sm text-white/80">Preset name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My setup"
          />
        </div>
      </div>
    </Modal>
  );
};
