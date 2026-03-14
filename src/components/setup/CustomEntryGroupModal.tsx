import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import Modal from '../common/Modal/Modal';
import ModalBottomContent from '../common/Modal/ModalBottomContent';
import { Input } from '../Input';

import {
  useCreateCustomEntryGroupMutation,
  useDeleteCustomEntryGroupMutation,
  useUpdateCustomEntryGroupMutation,
} from '@/api/customEntries';
import { useConfirmation } from '@/hooks/useConfirmation';
import type { CustomEntryGroup } from '@/types/customEntry';

interface CustomEntryGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: CustomEntryGroup | null;
}

const CustomEntryGroupModal: React.FC<CustomEntryGroupModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
}) => {
  const t = useTranslations();
  const isEditMode = !!groupToEdit;

  const [name, setName] = useState('');

  const { mutateAsync: createGroup, isPending: isCreating } =
    useCreateCustomEntryGroupMutation();
  const { mutateAsync: updateGroup, isPending: isUpdating } =
    useUpdateCustomEntryGroupMutation();
  const { mutateAsync: deleteGroup, isPending: isDeleting } =
    useDeleteCustomEntryGroupMutation();

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
      toast(t('setup.customCountryModal.entryNameIsRequired'), {
        type: 'error',
      });

      return;
    }

    try {
      if (isEditMode && groupToEdit) {
        await updateGroup({ id: groupToEdit._id, name: trimmed });
        toast.success(
          t('setup.customEntryGroupModal.groupUpdatedSuccessfully'),
        );
      } else {
        await createGroup({ name: trimmed });
        toast.success(
          t('setup.customEntryGroupModal.groupCreatedSuccessfully'),
        );
      }
      onClose();
    } catch (error: any) {
      toast(
        error?.response?.data?.message ??
          t('setup.customEntryGroupModal.failedToSaveGroup'),
        { type: 'error' },
      );
    }
  };

  const handleDelete = () => {
    if (!groupToEdit) return;

    confirm({
      key: 'delete-custom-entry-group',
      type: 'danger',
      title: t('settings.confirmations.deleteItem', { name: groupToEdit.name }),
      description: t('settings.confirmations.actionCannotBeUndone'),
      onConfirm: async () => {
        try {
          await deleteGroup(groupToEdit._id);
          toast.success(
            t('setup.customEntryGroupModal.groupDeletedSuccessfully'),
          );
          onClose();
        } catch (error: any) {
          toast(
            error?.response?.data?.message ??
              t('setup.customEntryGroupModal.failedToDeleteGroup'),
            { type: 'error' },
          );
        }
      },
    });
  };

  const isSaving = isCreating || isUpdating || isDeleting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,400px)]"
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
          {isEditMode
            ? t('setup.customEntryGroupModal.editGroup')
            : t('setup.customEntryGroupModal.createGroup')}
        </h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="groupName" className="text-white">
            {t('common.name')}
          </label>
          <Input
            id="groupName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('common.enterName')}
            className="lg:text-[0.95rem] text-sm"
          />
        </div>
      </div>
    </Modal>
  );
};

export default CustomEntryGroupModal;
