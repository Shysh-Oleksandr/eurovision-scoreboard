import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import Image from 'next/image';

import { UploadIcon } from '../../assets/icons/UploadIcon';
import { BaseCountry } from '../../models';
import CustomSelect from '../common/customSelect/CustomSelect';
import Modal from '../common/Modal/Modal';
import ModalBottomContent from '../common/Modal/ModalBottomContent';
import { Input } from '../Input';

import {
  useCreateCustomEntryMutation,
  useDeleteCustomEntryMutation,
  useUpdateCustomEntryMutation,
  useUploadCustomEntryFlagMutation,
} from '@/api/customEntries';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useCountriesStore } from '@/state/countriesStore';
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
  const [selectedStandardCountry, setSelectedStandardCountry] = useState('');
  const [selectedCustomEntry, setSelectedCustomEntry] = useState('');

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

  const customEntries = useCountriesStore((state) => state.customCountries);
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);

  // Validate if displayFlag is a valid image URL for Next.js Image component
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;

    // Must start with / for relative paths, or http:///https:// for absolute URLs
    // Also allow data: URLs for base64 images
    return (
      url.startsWith('/') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:')
    );
  };

  // Filter custom entries that are not from PRESET_IMAGES
  const reusableCustomEntries = useMemo(() => {
    const seenFlags = new Set<string>();

    return customEntries.filter((entry) => {
      if (
        !entry.flag ||
        entry.flag.includes('/custom-entries/presets/') ||
        seenFlags.has(entry.flag)
      ) {
        return false;
      }
      seenFlags.add(entry.flag);

      return true;
    });
  }, [customEntries]);

  // Get last 7 custom entries for horizontal display
  const recentCustomEntries = useMemo(() => {
    return [...reusableCustomEntries]
      .sort((a, b) =>
        b.updatedAt && a.updatedAt
          ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          : 0,
      )
      .slice(0, 7);
  }, [reusableCustomEntries]);

  // Standard countries options
  const standardCountryOptions = useMemo(() => {
    return getAllCountries(false).map((country) => ({
      label: country.name,
      value: country.code,
      imageUrl: getFlagPath(country),
    }));
  }, [getAllCountries]);

  // Custom entries options for select
  const customEntryOptions = useMemo(() => {
    return reusableCustomEntries.map((entry) => {
      // Ensure we always have a valid URL for Next.js Image
      let entryFlagSrc = getFlagPath('ww'); // Default fallback

      if (entry.flag && isValidImageUrl(entry.flag)) {
        entryFlagSrc = entry.flag;
      }

      return {
        label: entry.name,
        value: entry.flag || '',
        imageUrl: entryFlagSrc,
      };
    });
  }, [reusableCustomEntries]);

  useEffect(() => {
    if (countryToEdit) {
      setName(countryToEdit.name);

      const currentFlagUrl = countryToEdit.flag || '';

      setFlagUrl(currentFlagUrl);
      setUploadedFile(null);

      // Sync select states based on current flagUrl
      // Check if it's a standard country flag
      const standardCountry = getAllCountries(false).find((c) => {
        const countryFlagUrl = getFlagPath(c);

        return countryFlagUrl === currentFlagUrl;
      });

      if (standardCountry) {
        setSelectedStandardCountry(standardCountry.code);
        setSelectedCustomEntry('');
      } else {
        // Check if it's a custom entry flag
        const customEntry = reusableCustomEntries.find(
          (entry) => entry.flag === currentFlagUrl,
        );

        if (customEntry) {
          setSelectedCustomEntry(currentFlagUrl);
          setSelectedStandardCountry('');
        } else {
          setSelectedStandardCountry('');
          setSelectedCustomEntry('');
        }
      }
    } else {
      setName('');
      setFlagUrl('');
      setUploadedFile(null);
      setSelectedStandardCountry('');
      setSelectedCustomEntry('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryToEdit, isOpen, reusableCustomEntries]);

  // Handle standard country selection
  const handleStandardCountryChange = (countryCode: string) => {
    const country = getAllCountries(false).find((c) => c.code === countryCode);

    if (country) {
      const flagUrl = getFlagPath(country);

      setFlagUrl(flagUrl);
      setUploadedFile(null);
      imageUpload.clear();
      setSelectedStandardCountry(countryCode);
      setSelectedCustomEntry('');
    }
  };

  // Handle custom entry selection from select
  const handleCustomEntrySelectChange = (flagUrl: string) => {
    setFlagUrl(flagUrl);
    setUploadedFile(null);
    imageUpload.clear();
    setSelectedCustomEntry(flagUrl);
    setSelectedStandardCountry('');
  };

  // Handle custom entry click from horizontal list
  const handleCustomEntryClick = (flagUrl: string) => {
    setFlagUrl(flagUrl);
    setUploadedFile(null);
    imageUpload.clear();
    setSelectedCustomEntry(flagUrl);
    setSelectedStandardCountry('');
  };

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

  const previewFlag: string =
    displayFlag && isValidImageUrl(displayFlag)
      ? displayFlag
      : PRESET_IMAGES[1];

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
        <div className="flex flex-col gap-1">
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
        <div className="flex flex-col gap-3">
          <label className="text-white">Image</label>

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
              setSelectedStandardCountry('');
              setSelectedCustomEntry('');
            }}
            className="lg:text-[0.95rem] text-sm"
            placeholder="Paste an image URL"
            disabled={!!uploadedFile}
          />
          <div
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`flex  items-center justify-center gap-2 border-2 border-dashed rounded-md p-3 cursor-pointer transition-colors ${
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
            <UploadIcon className="w-6 h-6 text-white pointer-events-none" />
            <p className="text-white text-sm pointer-events-none">
              Drag & drop or click to upload
            </p>
          </div>

          <h4 className="middle-line text-white text-sm">Or select existing</h4>

          {/* Standard Countries and Custom Entries Selects */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <CustomSelect
                options={standardCountryOptions}
                value={selectedStandardCountry}
                onChange={handleStandardCountryChange}
                label="Standard Countries"
                id="standard-country-select"
                getImageClassName={() => 'w-8 h-6 !object-cover'}
                selectClassName="!shadow-none [&>div>span]:hidden"
              />
            </div>
            {customEntryOptions.length > 0 && (
              <div className="flex-1 min-w-[200px]">
                <CustomSelect
                  options={customEntryOptions}
                  value={selectedCustomEntry}
                  onChange={handleCustomEntrySelectChange}
                  label="Custom Entries"
                  id="custom-entry-select"
                  getImageClassName={() => 'w-8 h-6 !object-cover'}
                  selectClassName="!shadow-none [&>div>span]:hidden"
                />
              </div>
            )}
          </div>

          {/* Recent Custom Entries Horizontal List */}
          {recentCustomEntries.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-white text-sm">Recent Custom Entries:</p>
              <div className="flex gap-2 overflow-x-auto">
                {recentCustomEntries.map((entry) => {
                  // Ensure we always have a valid URL for Next.js Image
                  let entryFlagSrc = getFlagPath('ww'); // Default fallback

                  if (entry.flag && isValidImageUrl(entry.flag)) {
                    entryFlagSrc = entry.flag;
                  }

                  return (
                    <Image
                      key={entry.code}
                      src={entryFlagSrc}
                      width={50}
                      height={37}
                      alt={entry.name}
                      className={`cursor-pointer flex-none w-[50px] h-[37px] object-cover rounded-md border-2 ${
                        flagUrl === entry.flag
                          ? 'border-white'
                          : 'border-transparent'
                      }`}
                      onClick={() => handleCustomEntryClick(entry.flag || '')}
                      onError={(e) => {
                        // Fallback to default flag if image fails to load
                        const fallbackSrc = getFlagPath('ww');

                        if (isValidImageUrl(fallbackSrc)) {
                          e.currentTarget.src = fallbackSrc;
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Preset Images */}
          <div className="flex flex-col gap-1">
            <p className="text-white text-sm">Presets:</p>
            <div className="flex gap-2 overflow-x-auto">
              {PRESET_IMAGES.map((preset) => (
                <Image
                  key={preset}
                  src={preset}
                  width={50}
                  height={37}
                  alt="Preset Flag"
                  className={`cursor-pointer flex-none w-[50px] h-[37px] object-cover rounded-md border-2 ${
                    flagUrl === preset ? 'border-white' : 'border-transparent'
                  }`}
                  onClick={() => {
                    setFlagUrl(preset);
                    setUploadedFile(null);
                    imageUpload.clear();
                    setSelectedStandardCountry('');
                    setSelectedCustomEntry('');
                  }}
                />
              ))}
            </div>
          </div>

          <div className="">
            <h4 className="middle-line text-white text-sm mb-1">Preview</h4>

            <Image
              src={previewFlag}
              alt="Selected flag"
              className="rounded-md object-cover w-[100px] h-[70px]"
              width={100}
              height={70}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomCountryModal;
