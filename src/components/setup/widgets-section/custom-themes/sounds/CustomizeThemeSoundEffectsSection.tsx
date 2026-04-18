'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import {
  isValidHttpsSoundUrl,
  THEME_SOUND_LABEL_KEYS,
} from './customizeThemeSoundConstants';
import CustomizeThemeSoundEffectRow from './CustomizeThemeSoundEffectRow';

import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import {
  THEME_SOUND_EVENTS,
  type ThemeSoundEventId,
} from '@/theme/themeSoundEvents';

export type CustomizeThemeSoundEffectsSectionProps = {
  soundUrls: Record<ThemeSoundEventId, string>;
  setSoundUrls: React.Dispatch<
    React.SetStateAction<Record<ThemeSoundEventId, string>>
  >;
  soundFiles: Record<ThemeSoundEventId, File | null>;
  setSoundFiles: React.Dispatch<
    React.SetStateAction<Record<ThemeSoundEventId, File | null>>
  >;
  soundDelaySecText: Record<ThemeSoundEventId, string>;
  setSoundDelaySecText: React.Dispatch<
    React.SetStateAction<Record<ThemeSoundEventId, string>>
  >;
  soundDragOver: ThemeSoundEventId | null;
  handleSoundDrag: (e: React.DragEvent) => void;
  handleSoundRowDragEnter: (
    event: ThemeSoundEventId,
  ) => (e: React.DragEvent) => void;
  handleSoundRowDragLeave: (
    event: ThemeSoundEventId,
  ) => (e: React.DragEvent) => void;
  handleSoundRowDrop: (
    event: ThemeSoundEventId,
  ) => (e: React.DragEvent) => void;
  soundPreviewState: { event: ThemeSoundEventId; paused: boolean } | null;
  stopSoundPreview: () => void;
  toggleSoundPreview: (event: ThemeSoundEventId) => void;
  handleSoundFilePick: (event: ThemeSoundEventId, file: File | null) => void;
};

const CustomizeThemeSoundEffectsSection: React.FC<
  CustomizeThemeSoundEffectsSectionProps
> = ({
  soundUrls,
  setSoundUrls,
  soundFiles,
  setSoundFiles,
  soundDelaySecText,
  setSoundDelaySecText,
  soundDragOver,
  handleSoundDrag,
  handleSoundRowDragEnter,
  handleSoundRowDragLeave,
  handleSoundRowDrop,
  soundPreviewState,
  stopSoundPreview,
  toggleSoundPreview,
  handleSoundFilePick,
}) => {
  const t = useTranslations();

  return (
    <CollapsibleSection
      title={t('widgets.themes.soundEffects')}
      defaultExpanded
    >
      <div className="space-y-3">
        <p className="text-sm font-medium text-white/60">
          {t('widgets.themes.soundEffectsHint')}
        </p>
        <div className="space-y-3">
          {THEME_SOUND_EVENTS.map((event) => {
            const canPreviewSound =
              !!soundFiles[event] || isValidHttpsSoundUrl(soundUrls[event]);

            return (
              <CustomizeThemeSoundEffectRow
                key={event}
                event={event}
                title={t(`widgets.themes.${THEME_SOUND_LABEL_KEYS[event]}`)}
                soundUrl={soundUrls[event]}
                soundFile={soundFiles[event]}
                delaySecText={soundDelaySecText[event]}
                canPreviewSound={canPreviewSound}
                soundDragOver={soundDragOver === event}
                isPreviewActive={soundPreviewState?.event === event}
                previewPaused={!!soundPreviewState?.paused}
                onUrlChange={(value) => {
                  if (soundPreviewState?.event === event) {
                    stopSoundPreview();
                  }
                  setSoundUrls((p) => ({ ...p, [event]: value }));
                  setSoundFiles((p) => ({ ...p, [event]: null }));
                }}
                onDelaySecTextChange={(value) =>
                  setSoundDelaySecText((p) => ({ ...p, [event]: value }))
                }
                onPickFile={(file) => handleSoundFilePick(event, file)}
                onUploadButtonClick={() =>
                  document.getElementById(`theme-sound-file-${event}`)?.click()
                }
                onTogglePreview={() => toggleSoundPreview(event)}
                onClear={() => {
                  if (soundPreviewState?.event === event) {
                    stopSoundPreview();
                  }
                  setSoundUrls((p) => ({ ...p, [event]: '' }));
                  setSoundFiles((p) => ({ ...p, [event]: null }));
                  setSoundDelaySecText((p) => ({ ...p, [event]: '' }));
                }}
                onDragEnter={handleSoundRowDragEnter(event)}
                onDragLeave={handleSoundRowDragLeave(event)}
                onDragOver={handleSoundDrag}
                onDrop={handleSoundRowDrop(event)}
              />
            );
          })}
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default CustomizeThemeSoundEffectsSection;
