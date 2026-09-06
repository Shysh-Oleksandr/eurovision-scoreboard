'use client';

import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';

import FontEditorCard from './FontEditorCard';
import { customSelection, FontSelection } from './fontPickerTypes';
import FontSignInPrompt from './FontSignInPrompt';

import {
  FONT_ACCEPT_ATTR,
  FONT_MAX_FILE_MB,
  fontToSnapshot,
  useUploadFontMutation,
} from '@/api/fonts';
import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useFontFilesValidation } from '@/hooks/useFontFilesValidation';
import { useAuthStore } from '@/state/useAuthStore';
import type { Font } from '@/types/font';

interface UploadFontTabProps {
  onSelect: (selection: FontSelection) => void;
}

/**
 * "Upload first, tweak after": files go straight to the library, then the
 * editor card lets the user rename, fix weight slots and pick the font.
 */
const UploadFontTab: React.FC<UploadFontTabProps> = ({ onSelect }) => {
  const t = useTranslations('widgets.themes.fonts');
  const tc = useTranslations('common');
  const user = useAuthStore((s) => s.user);
  const { validate } = useFontFilesValidation();
  const uploadFont = useUploadFontMutation();

  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [font, setFont] = useState<Font | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <FontSignInPrompt />;

  const handleFiles = async (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    const { valid, errors } = validate(Array.from(list));

    errors.forEach((message) => toast.error(message));
    if (valid.length === 0) return;

    setProgress(0);
    try {
      const result = await uploadFont.mutateAsync({
        files: valid,
        onUploadProgress: (p) => setProgress(p.percent),
      });

      setFont(result.font);
      setWarnings(result.warnings);
      toast.success(t('uploadedSuccessfully'));
    } catch (error) {
      toastAxiosError(error, t('uploadFailed'));
    } finally {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const prevent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (font) {
    return (
      <div className="space-y-3">
        <FontEditorCard
          font={font}
          warnings={warnings}
          onFontChange={setFont}
          onUse={() => onSelect(customSelection(fontToSnapshot(font)))}
        />
        <div className="flex justify-start">
          <Button
            variant="tertiary"
            className="text-sm"
            onClick={() => {
              setFont(null);
              setWarnings([]);
            }}
          >
            {t('uploadAnother')}
          </Button>
        </div>
      </div>
    );
  }

  const isUploading = progress !== null;

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          prevent(e);
          if (e.dataTransfer.items?.length) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          prevent(e);
          setIsDragOver(false);
        }}
        onDragOver={prevent}
        onDrop={(e) => {
          prevent(e);
          setIsDragOver(false);
          void handleFiles(e.dataTransfer.files);
          e.dataTransfer.clearData();
        }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[12px] p-6 transition-colors ${
          isDragOver ? 'border-white bg-primary-700/50' : 'border-white/40'
        } ${isUploading ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FONT_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <UploadIcon className="w-8 h-8 text-white pointer-events-none" />
        <p className="text-white text-sm font-medium text-center pointer-events-none">
          {t('dropHint')}
        </p>
        <p className="text-white/60 text-xs text-center pointer-events-none">
          {t('formatsHint', { maxMb: FONT_MAX_FILE_MB })}
        </p>
        <Button
          variant="tertiary"
          className="w-fit text-sm !py-1.5 mt-1 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={isUploading}
        >
          {tc('browse')}
        </Button>
      </div>

      {isUploading && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/80 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/70">
            {progress < 100
              ? t('uploading', { percent: progress })
              : t('processing')}
          </p>
        </div>
      )}

      <ul className="text-xs text-white/60 space-y-1 list-disc pl-4">
        <li>{t('fallbackHint')}</li>
        <li>{t('variableHint')}</li>
        <li>{t('licenseHint')}</li>
      </ul>
    </div>
  );
};

export default UploadFontTab;
