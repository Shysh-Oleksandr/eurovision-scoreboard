import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import { UndoIcon } from '@/assets/icons/UndoIcon';
import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import { Input } from '@/components/Input';
import { toast } from '@/helpers/toast';
import {
  BACKGROUND_VIDEO_ACCEPT,
  BACKGROUND_VIDEO_MAX_MB,
  BACKGROUND_VIDEO_MAX_SECONDS,
  type BackgroundVideoLinkProblem,
  type BackgroundVideoProblem,
  checkBackgroundVideoLink,
} from '@/theme/backgroundVideo/backgroundVideoRules';
import { readBackgroundVideo } from '@/theme/backgroundVideo/readBackgroundVideo';

export const BACKGROUND_VIDEO_PROBLEM_KEYS: Record<
  BackgroundVideoProblem,
  string
> = {
  type: 'errorType',
  size: 'errorSize',
  duration: 'errorDuration',
  resolution: 'errorResolution',
  unplayable: 'errorUnplayable',
};

export const BACKGROUND_VIDEO_LINK_PROBLEM_KEYS: Record<
  BackgroundVideoLinkProblem,
  string
> = {
  https: 'errorHttps',
  page: 'errorPageLink',
};

interface BackgroundVideoFieldProps {
  url: string;
  file: File | null;
  /** The preview couldn't play the linked video. */
  linkFailed: boolean;
  /** 0–100 while the picked file uploads on save. */
  uploadPercent: number | null;
  /** A checked file and its first frame, which becomes the background image. */
  onPickFile: (file: File, firstFrame: File) => void;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
}

/**
 * The theme editor's Background video field (docs/background-video.md): an
 * upload, checked and turned into a first frame here, or an https link to a
 * video file. Uploads come first.
 */
const BackgroundVideoField: React.FC<BackgroundVideoFieldProps> = ({
  url,
  file,
  linkFailed,
  uploadPercent,
  onPickFile,
  onUrlChange,
  onRemove,
}) => {
  const t = useTranslations('widgets.themes.backgroundVideo');
  const tCommon = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const linkProblem = file ? null : checkBackgroundVideoLink(url);

  const handleFile = async (picked: File | null | undefined) => {
    if (!picked || isReading) return;

    setIsReading(true);
    try {
      const result = await readBackgroundVideo(picked);

      if (result.problem) {
        toast.error(
          t(BACKGROUND_VIDEO_PROBLEM_KEYS[result.problem], {
            maxSize: BACKGROUND_VIDEO_MAX_MB,
            maxSeconds: BACKGROUND_VIDEO_MAX_SECONDS,
          }),
        );

        return;
      }
      onPickFile(picked, result.firstFrame);
    } finally {
      setIsReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const stop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-medium text-white">{t('title')}</h4>
        {(!!file || !!url) && (
          <Button
            variant="secondary"
            className="w-fit pointer-events-auto text-sm !py-1.5 !px-4"
            Icon={<UndoIcon className="w-4 h-4" />}
            onClick={onRemove}
            aria-label={t('remove')}
            title={t('remove')}
          />
        )}
      </div>
      <p className="text-white/50 text-xs mb-2">
        {t('hint', {
          maxSize: BACKGROUND_VIDEO_MAX_MB,
          maxSeconds: BACKGROUND_VIDEO_MAX_SECONDS,
        })}
      </p>
      <div className="space-y-3">
        <div
          onDragEnter={(e) => {
            stop(e);
            if (e.dataTransfer.items?.length) setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            stop(e);
            setIsDragOver(false);
          }}
          onDragOver={stop}
          onDrop={(e) => {
            stop(e);
            setIsDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[10px] p-3 transition-colors ${
            isDragOver ? 'border-white bg-primary-700/50' : 'border-white/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={BACKGROUND_VIDEO_ACCEPT}
            onChange={(e) => void handleFile(e.target.files?.[0])}
            className="hidden"
          />
          <UploadIcon className="w-8 h-8 text-white pointer-events-none" />
          <p className="text-white text-xs pointer-events-none text-center">
            {isReading ? t('reading') : tCommon('dragAndDropOrClickToUpload')}
          </p>
          <Button
            variant="tertiary"
            className="w-fit pointer-events-auto text-sm !py-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={isReading}
          >
            {tCommon('browse')}
          </Button>
        </div>

        {file && (
          <p className="text-white/70 text-xs truncate">
            {uploadPercent !== null
              ? t('uploading', { percent: uploadPercent })
              : t('pickedFile', { name: file.name })}
          </p>
        )}

        <Input
          type="url"
          inputMode="url"
          value={file ? '' : url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t('pasteUrl')}
          disabled={!!file}
        />
        {(linkProblem || (linkFailed && url.trim())) && (
          <p className="text-white/70 text-xs">
            {linkProblem
              ? t(BACKGROUND_VIDEO_LINK_PROBLEM_KEYS[linkProblem])
              : t('errorLinkUnplayable')}
          </p>
        )}
      </div>
    </div>
  );
};

export default BackgroundVideoField;
