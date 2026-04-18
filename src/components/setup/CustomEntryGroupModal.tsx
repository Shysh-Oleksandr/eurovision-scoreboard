import { useTranslations } from 'next-intl';
import React from 'react';

import UserResourceGroupModal from './UserResourceGroupModal';

import {
  useCreateCustomEntryGroupMutation,
  useDeleteCustomEntryGroupMutation,
  useUpdateCustomEntryGroupMutation,
} from '@/api/customEntries';
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

  const { mutateAsync: createGroup, isPending: isCreating } =
    useCreateCustomEntryGroupMutation();
  const { mutateAsync: updateGroup, isPending: isUpdating } =
    useUpdateCustomEntryGroupMutation();
  const { mutateAsync: deleteGroup, isPending: isDeleting } =
    useDeleteCustomEntryGroupMutation();

  const isSaving = isCreating || isUpdating || isDeleting;

  return (
    <UserResourceGroupModal
      isOpen={isOpen}
      onClose={onClose}
      groupToEdit={groupToEdit}
      isSaving={isSaving}
      confirmDeleteKey="delete-custom-entry-group"
      confirmDeleteTitle={
        groupToEdit
          ? t('settings.confirmations.deleteItem', { name: groupToEdit.name })
          : ''
      }
      confirmDeleteDescription={t(
        'settings.confirmations.actionCannotBeUndone',
      )}
      labels={{
        createTitle: t('setup.customEntryGroupModal.createGroup'),
        editTitle: t('setup.customEntryGroupModal.editGroup'),
        nameRequired: t('setup.customCountryModal.entryNameIsRequired'),
        createdSuccess: t(
          'setup.customEntryGroupModal.groupCreatedSuccessfully',
        ),
        updatedSuccess: t(
          'setup.customEntryGroupModal.groupUpdatedSuccessfully',
        ),
        deletedSuccess: t(
          'setup.customEntryGroupModal.groupDeletedSuccessfully',
        ),
        failedSave: t('setup.customEntryGroupModal.failedToSaveGroup'),
        failedDelete: t('setup.customEntryGroupModal.failedToDeleteGroup'),
        nameLabel: t('common.name'),
        namePlaceholder: t('common.enterName'),
      }}
      onCreate={(name) => createGroup({ name })}
      onUpdate={(id, name) => updateGroup({ id, name })}
      onDelete={(id) => deleteGroup(id)}
    />
  );
};

export default CustomEntryGroupModal;
