'use client';

import { Pause, Play, TrashIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { UploadIcon } from '@/assets/icons/UploadIcon';
import Button from '@/components/common/Button';
import { Input } from '@/components/Input';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

export type CustomizeThemeSoundEffectRowProps = {
  event: ThemeSoundEventId;
  title: string;
  soundUrl: string;
  soundFile: File | null;
  delaySecText: string;
  canPreviewSound: boolean;
  soundDragOver: boolean;
  isPreviewActive: boolean;
  previewPaused: boolean;
  onUrlChange: (value: string) => void;
  onDelaySecTextChange: (value: string) => void;
  onPickFile: (file: File | null) => void;
  onUploadButtonClick: () => void;
  onTogglePreview: () => void;
  onClear: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

const CustomizeThemeSoundEffectRow: React.FC<
  CustomizeThemeSoundEffectRowProps
> = ({
  event,
  title,
  soundUrl,
  soundFile,
  delaySecText,
  canPreviewSound,
  soundDragOver,
  isPreviewActive,
  previewPaused,
  onUrlChange,
  onDelaySecTextChange,
  onPickFile,
  onUploadButtonClick,
  onTogglePreview,
  onClear,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}) => {
  const t = useTranslations();

  return (
    <div
      className={`space-y-1 rounded-md py-1.5 px-2 transition-colors bg-primary-700/20 ${
        soundDragOver ? 'ring-1 ring-white/60 bg-primary-700/25' : ''
      }`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h5 className="text-sm font-medium text-white">{title}</h5>
        {event !== 'simulationBackground' && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <label
              htmlFor={`theme-sound-delay-${event}`}
              className="text-xs font-medium text-white/70 shrink-0"
            >
              {t('widgets.themes.soundDelaySec')}
            </label>
            <Input
              id={`theme-sound-delay-${event}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={delaySecText}
              onChange={(e) => onDelaySecTextChange(e.target.value)}
              placeholder="0"
              className="w-[100px] md:w-[120px] !py-1"
              aria-describedby={`theme-sound-delay-hint-${event}`}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          id={`theme-sound-file-${event}`}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/webm,audio/ogg,audio/wav,.mp3,.webm,.ogg,.wav"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        <Input
          type="text"
          value={soundFile ? soundFile.name : soundUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t('widgets.themes.soundUrl')}
          disabled={!!soundFile}
          className="w-full md:w-auto md:flex-1"
        />
        <span className="text-sm text-white/90 font-medium lowercase">
          {t('common.or')}
        </span>

        <Button
          variant="tertiary"
          className="md:h-[40px] h-[35px] md:!px-3 flex-1 md:flex-none justify-center"
          onClick={onUploadButtonClick}
          Icon={<UploadIcon className="w-5 h-5" />}
          label={t('common.upload')}
        />

        <Button
          onClick={onTogglePreview}
          disabled={!canPreviewSound}
          title={t('widgets.themes.previewSound')}
          aria-label={t('widgets.themes.previewSound')}
          className="md:h-[40px] h-[35px] !px-3"
          Icon={
            isPreviewActive && !previewPaused ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )
          }
        />
        <Button
          variant="destructive"
          className="md:h-[40px] h-[35px] !px-3"
          onClick={onClear}
          Icon={<TrashIcon className="w-5 h-5" />}
          disabled={!canPreviewSound}
        />
      </div>
    </div>
  );
};

export default CustomizeThemeSoundEffectRow;
