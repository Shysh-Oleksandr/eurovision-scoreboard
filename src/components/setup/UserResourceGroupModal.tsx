import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Modal from '../common/Modal/Modal';
import ModalBottomContent from '../common/Modal/ModalBottomContent';
import { Input } from '../Input';

import { useConfirmation } from '@/hooks/useConfirmation';

export interface UserResourceGroupLabels {
  createTitle: string;
  editTitle: string;
  nameRequired: string;
  createdSuccess: string;
  updatedSuccess: string;
  deletedSuccess: string;
  failedSave: string;
  failedDelete: string;
  nameLabel: string;
  namePlaceholder: string;
}

export interface UserResourceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: { _id: string; name: string } | null;
  labels: UserResourceGroupLabels;
  isSaving: boolean;
  confirmDeleteKey: string;
  confirmDeleteTitle: string;
  confirmDeleteDescription: string;
  onCreate: (name: string) => Promise<unknown>;
  onUpdate: (id: string, name: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

const UserResourceGroupModal: React.FC<UserResourceGroupModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
  labels,
  isSaving,
  confirmDeleteKey,
  confirmDeleteTitle,
  confirmDeleteDescription,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const isEditMode = !!groupToEdit;
  const [name, setName] = useState('');
  const { confirm } = useConfirmation();

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
    } else {
      setName('');
    }
  }, [groupToEdit, isOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      toast(labels.nameRequired, { type: 'error' });

      return;
    }
    try {
      if (isEditMode && groupToEdit) {
        await onUpdate(groupToEdit._id, trimmed);
        toast.success(labels.updatedSuccess);
      } else {
        await onCreate(trimmed);
        toast.success(labels.createdSuccess);
      }
      onClose();
    } catch (error: any) {
      toast(error?.response?.data?.message ?? labels.failedSave, {
        type: 'error',
      });
    }
  };

  const handleDelete = () => {
    if (!groupToEdit) return;
    confirm({
      key: confirmDeleteKey,
      type: 'danger',
      title: confirmDeleteTitle,
      description: confirmDeleteDescription,
      onConfirm: async () => {
        try {
          await onDelete(groupToEdit._id);
          toast.success(labels.deletedSuccess);
          onClose();
        } catch (error: any) {
          toast(error?.response?.data?.message ?? labels.failedDelete, {
            type: 'error',
          });
        }
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      withBlur
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          onDelete={isEditMode ? handleDelete : undefined}
          isSaving={isSaving}
        />
      }
    >
      <div className="flex flex-col gap-4 p-2">
        <h2 className="text-xl font-bold text-white">
          {isEditMode ? labels.editTitle : labels.createTitle}
        </h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="resource-group-name" className="text-white">
            {labels.nameLabel}
          </label>
          <Input
            id="resource-group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={labels.namePlaceholder}
          />
        </div>
      </div>
    </Modal>
  );
};

export default UserResourceGroupModal;
