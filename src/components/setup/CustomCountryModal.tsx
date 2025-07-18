import React, { useEffect, useRef, useState } from 'react';

import { UploadIcon } from '../../assets/icons/UploadIcon';
import { BaseCountry } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';
import ModalBottomContent from '../common/Modal/ModalBottomContent';

interface CustomCountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryToEdit?: BaseCountry;
}

const PRESET_IMAGES = [
  '/flags/earth.svg',
  '/flags/world.svg',
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

  const [name, setName] = useState('');
  const [flag, setFlag] = useState('');
  const addCustomCountry = useCountriesStore((state) => state.addCustomCountry);
  const updateCustomCountry = useCountriesStore(
    (state) => state.updateCustomCountry,
  );
  const deleteCustomCountry = useCountriesStore(
    (state) => state.deleteCustomCountry,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (countryToEdit) {
      setName(countryToEdit.name);
      setFlag(countryToEdit.flag || '');
    } else {
      setName('');
      setFlag('');
    }
  }, [countryToEdit, isOpen]);

  const handleSave = async () => {
    if (name.trim() === '') {
      alert('Entry name is required.');

      return;
    }

    if (isEditMode) {
      await updateCustomCountry({ ...countryToEdit, name, flag });
    } else {
      await addCustomCountry({ name, flag });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!countryToEdit) return;

    if (
      window.confirm(`Are you sure you want to delete ${countryToEdit.name}?`)
    ) {
      await deleteCustomCountry(countryToEdit.code);
      onClose();
    }
  };

  const handleFileChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setFlag(reader.result as string);
      };
      reader.readAsDataURL(file);
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
          <input
            id="countryName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full py-3 pl-3 pr-10 rounded-md bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 transition-colors duration-300 placeholder:text-white/55 text-white lg:text-[0.95rem] text-sm border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white "
            placeholder="Enter name..."
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
              accept="image/*"
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

          <input
            id="flagUrl"
            type="text"
            value={flag.startsWith('data:image') ? '' : flag}
            onChange={(e) => setFlag(e.target.value)}
            className="w-full py-3 pl-3 pr-10 rounded-md bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 transition-colors duration-300 placeholder:text-white/55 text-white lg:text-[0.95rem] text-sm border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white "
            placeholder="Or paste an image URL"
          />

          <div className="flex gap-2 flex-wrap">
            {PRESET_IMAGES.map((preset) => (
              <img
                key={preset}
                src={preset}
                width={50}
                height={37}
                alt="Preset Flag"
                className={`cursor-pointer object-cover rounded-md border-2 ${
                  flag === preset ? 'border-white' : 'border-transparent'
                }`}
                onClick={() => setFlag(preset)}
              />
            ))}
          </div>

          {flag && (
            <div className="mt-2">
              <p className="text-white text-sm mb-1">Preview:</p>
              <img
                src={flag}
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
