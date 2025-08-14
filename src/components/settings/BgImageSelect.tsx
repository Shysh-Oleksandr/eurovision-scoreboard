import React, { useEffect, useRef, useState } from 'react';

import Button from '../common/Button';
import { Checkbox } from '../common/Checkbox';

import { UploadIcon } from '@/assets/icons/UploadIcon';
import {
  deleteCustomBgImageFromDB,
  getCustomBgImageFromDB,
  saveCustomBgImageToDB,
} from '@/helpers/indexedDB';
import { useGeneralStore } from '@/state/generalStore';

const screenAspectRatio = window.innerWidth / window.innerHeight;
const imageSize = 100;

export const BgImageSelect: React.FC = () => {
  const shouldUseCustomBgImage = useGeneralStore(
    (state) => state.settings.shouldUseCustomBgImage,
  );
  const customBgImage = useGeneralStore(
    (state) => state.settings.customBgImage,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');

      return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      const result = reader.result as string;

      // Save in IndexedDB and only keep a flag + maybe a tiny preview in state
      await saveCustomBgImageToDB(result);
      setSettings({ customBgImage: result });
    };

    reader.readAsDataURL(file);
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

  const clearImage = async () => {
    await deleteCustomBgImageFromDB();
    setSettings({ customBgImage: null });
  };

  // Ensure we load from IndexedDB if we enabled custom background but have no image loaded yet
  useEffect(() => {
    (async () => {
      if (shouldUseCustomBgImage && !customBgImage) {
        const dbImage = await getCustomBgImageFromDB();

        if (dbImage) setSettings({ customBgImage: dbImage });
      }
    })();
  }, [shouldUseCustomBgImage, customBgImage, setSettings]);

  return (
    <>
      <Checkbox
        id="use-custom-bg-image"
        labelClassName="w-full"
        className="flex items-center"
        label="Use custom background image"
        checked={shouldUseCustomBgImage}
        onChange={(e) =>
          setSettings({ shouldUseCustomBgImage: e.target.checked })
        }
      />

      {shouldUseCustomBgImage && (
        <div className="flex flex-col gap-2">
          <div
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex items-center gap-2 border-2 border-dashed rounded-md p-2 cursor-pointer transition-colors ${
              isDragOver ? 'border-white bg-primary-700/50' : 'border-white/40'
            }`}
            onClick={handleBrowseClick}
            role="button"
            aria-label="Upload background image"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <UploadIcon className="w-6 h-6 text-white pointer-events-none" />
            <div className="flex flex-col pointer-events-none">
              <span className="text-white text-sm">
                Drag & drop or click to upload
              </span>
              <span className="text-white/70 text-xs">PNG, JPG, WEBP</span>
            </div>
          </div>

          {customBgImage && (
            <div className="flex items-center gap-2">
              <img
                src={customBgImage}
                alt="Background preview"
                className="rounded object-cover"
                width={screenAspectRatio * imageSize}
                height={imageSize}
                style={{
                  width: screenAspectRatio * imageSize,
                  height: imageSize,
                }}
              />
              <Button variant="secondary" onClick={clearImage}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
