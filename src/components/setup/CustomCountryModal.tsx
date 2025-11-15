import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import Image from 'next/image';

import { UploadIcon } from '../../assets/icons/UploadIcon';
import { BaseCountry } from '../../models';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import ModalBottomContent from '../common/Modal/ModalBottomContent';
import { Input } from '../Input';

import {
  useCreateCustomEntryMutation,
  useDeleteCustomEntryMutation,
  useUpdateCustomEntryMutation,
  useUploadCustomEntryFlagMutation,
} from '@/api/customEntries';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuthStore } from '@/state/useAuthStore';

interface CustomCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryToEdit?: BaseCountry;
}

// These are stored in `https://cdn.douzepoints.app/custom-entries/presets/{name}`, e.g. `https://cdn.douzepoints.app/custom-entries/presets/earth.svg`
const PRESET_IMAGES = [
  '/flags/earth.svg',
  '/flags/world.svg',
  '/flags/floptropica.svg',
  '/flags/neutral.svg',
  '/flags/lgbt.svg',
  '/flags/neutrois.svg',
  '/flags/aromantic.svg',
];

const CustomCountryModal: React.FC<CustomCountryModalProps> = ({
  isOpen,
  onClose,
  countryToEdit,
}) => {
  const isEditMode = !!countryToEdit;
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;

  const [name, setName] = useState('');
  const [flagUrl, setFlagUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { mutateAsync: createEntry, isPending: isCreating } =
    useCreateCustomEntryMutation();
  const { mutateAsync: updateEntry, isPending: isUpdating } =
    useUpdateCustomEntryMutation();
  const { mutateAsync: deleteEntry, isPending: isDeleting } =
    useDeleteCustomEntryMutation();
  const { mutateAsync: uploadFlag, isPending: isUploadingFlag } =
    useUploadCustomEntryFlagMutation();

  const imageUpload = useImageUpload({ maxSizeInMB: 0.5 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (countryToEdit) {
      setName(countryToEdit.name);
      setFlagUrl(countryToEdit.flag || '');
      setUploadedFile(null);
    } else {
      setName('');
      setFlagUrl('');
      setUploadedFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryToEdit, isOpen]);

  const getEntryId = (): string | null => {
    if (!countryToEdit?.code.startsWith('custom-')) return null;

    return countryToEdit.code.replace('custom-', '');
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast('Please sign in to create custom entries.', {
        type: 'error',
      });

      return;
    }

    if (name.trim() === '') {
      toast('Entry name is required.', {
        type: 'error',
      });

      return;
    }

    try {
      if (isEditMode) {
        const entryId = getEntryId();

        if (!entryId) {
          toast('Invalid entry ID', { type: 'error' });

          return;
        }

        // Update entry
        await updateEntry({
          id: entryId,
          name,
          flagUrl,
        });

        // Upload file if provided
        if (uploadedFile) {
          await uploadFlag({ id: entryId, file: uploadedFile });
        }
      } else {
        // Create new entry
        const newEntry = await createEntry({
          name,
          flagUrl: flagUrl || PRESET_IMAGES[1],
        });

        // Upload file if provided
        if (uploadedFile) {
          await uploadFlag({ id: newEntry._id, file: uploadedFile });
        }
      }

      toast('Custom entry saved successfully!', { type: 'success' });

      onClose();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to save entry', {
        type: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!countryToEdit) return;

    if (!isAuthenticated) {
      toast('Please sign in to delete custom entries.', {
        type: 'error',
      });

      return;
    }

    if (
      !window.confirm(`Are you sure you want to delete ${countryToEdit.name}?`)
    ) {
      return;
    }

    try {
      const entryId = getEntryId();

      if (!entryId) {
        toast('Invalid entry ID', { type: 'error' });

        return;
      }

      await deleteEntry(entryId);
      toast('Entry deleted successfully!', { type: 'success' });

      onClose();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to delete entry', {
        type: 'error',
      });
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    const { isValid, error } = await imageUpload.validateAndSetFile(file);

    if (isValid) {
      setUploadedFile(file);
      setFlagUrl(''); // Clear URL input when file is selected
    } else if (error) {
      toast(error, { type: 'error' });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    handleDrag(e);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    handleDrag(e);
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e);
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const isSaving = isCreating || isUpdating || isDeleting || isUploadingFlag;

  const displayFlag = uploadedFile
    ? imageUpload.base64
    : flagUrl.startsWith('/flags/')
    ? flagUrl
    : flagUrl || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          onDelete={countryToEdit ? handleDelete : undefined}
          isSaving={isSaving}
        />
      }
    >
      <div className="flex flex-col gap-4 p-2">
        <h2 className="text-xl font-bold text-white">
          {isEditMode ? 'Edit' : 'Create'} Custom Entry
        </h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="countryName" className="text-white">
            Name
          </label>
          <Input
            id="countryName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            className="lg:text-[0.95rem] text-sm"
          />
        </div>
        <div className="flex flex-col gap-4">
          <label className="text-white">Image</label>

          <div
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors ${
              isDragOver ? 'border-white bg-primary-700/50' : 'border-white/40'
            }`}
          >
            <input
              ref={fileInputRef}
              id="flagUpload"
              type="file"
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <UploadIcon className="w-10 h-10 text-white pointer-events-none" />
            <p className="text-white text-sm pointer-events-none">
              Drag & drop an image
            </p>
            <span className="text-white text-xs text-center pointer-events-none">
              OR
            </span>
            <Button
              variant="tertiary"
              className="w-fit pointer-events-auto"
              onClick={handleBrowseClick}
            >
              Browse
            </Button>
          </div>

          <Input
            id="flagUrl"
            type="text"
            value={
              uploadedFile ? '' : flagUrl.startsWith('/flags/') ? '' : flagUrl
            }
            onChange={(e) => {
              setFlagUrl(e.target.value);
              setUploadedFile(null);
              imageUpload.clear();
            }}
            className="lg:text-[0.95rem] text-sm"
            placeholder="Or paste an image URL"
            disabled={!!uploadedFile}
          />

          <div className="flex gap-2 flex-wrap">
            {PRESET_IMAGES.map((preset) => (
              <Image
                key={preset}
                src={preset}
                width={50}
                height={37}
                alt="Preset Flag"
                className={`cursor-pointer object-cover rounded-md border-2 ${
                  flagUrl === preset ? 'border-white' : 'border-transparent'
                }`}
                onClick={() => {
                  setFlagUrl(preset);
                  setUploadedFile(null);
                  imageUpload.clear();
                }}
              />
            ))}
          </div>

          {displayFlag && (
            <div className="mt-2">
              <p className="text-white text-sm mb-1">Preview:</p>
              <Image
                src={displayFlag}
                alt="Selected flag"
                className="rounded-md object-cover"
                width={96}
                height={72}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CustomCountryModal;
