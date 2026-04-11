import { useTranslations } from 'next-intl';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';
import { RangeSlider } from '../common/RangeSlider';

import { BgImageSelect } from './BgImageSelect';
import { LanguageSelector } from './LanguageSelector';

import { InfoIcon } from '@/assets/icons/InfoIcon';
import { customThemeHasSimulationBackground } from '@/theme/customThemeHasAudio';

export const UIPreferencesSettings: React.FC = () => {
  const t = useTranslations('settings.ui');
  const settings = useGeneralStore((state) => state.settings);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const setSettings = useGeneralStore((state) => state.setSettings);

  const isFullScreenSupported = document.fullscreenEnabled;
  const hasSimBg = customThemeHasSimulationBackground(customTheme);

  return (
    <>
      <LanguageSelector />

      <Checkbox
        id="show-heart-flag-icon"
        labelClassName="w-full"
        label={t('useHeartIconsForFlags')}
        checked={settings.shouldShowHeartFlagIcon}
        onChange={(e) =>
          setSettings({ shouldShowHeartFlagIcon: e.target.checked })
        }
      />
      <Checkbox
        id="show-place-number"
        labelClassName="w-full"
        label={t('alwaysShowRankings')}
        checked={settings.alwaysShowRankings}
        onChange={(e) => setSettings({ alwaysShowRankings: e.target.checked })}
      />
      <Checkbox
        id="show-rank-change-indicator"
        labelClassName="w-full"
        label={t('showRankChangeIndicator')}
        checked={settings.showRankChangeIndicator}
        onChange={(e) =>
          setSettings({ showRankChangeIndicator: e.target.checked })
        }
      />
      <Checkbox
        id="show-qualification-modal"
        labelClassName="w-full"
        label={t('showQualifiersPopup')}
        checked={settings.showQualificationModal}
        onChange={(e) =>
          setSettings({ showQualificationModal: e.target.checked })
        }
      />
      <Checkbox
        id="show-winner-modal"
        labelClassName="w-full"
        label={t('showWinnerPopup')}
        checked={settings.showWinnerModal}
        onChange={(e) => setSettings({ showWinnerModal: e.target.checked })}
      />
      <Checkbox
        id="show-winner-confetti"
        labelClassName="w-full"
        label={t('showWinnerConfetti')}
        checked={settings.showWinnerConfetti}
        onChange={(e) => setSettings({ showWinnerConfetti: e.target.checked })}
      />
      {isFullScreenSupported && (
        <Checkbox
          id="enable-fullscreen"
          labelClassName="w-full"
          label={t('enableFullscreenMode')}
          checked={settings.enableFullscreen}
          onChange={(e) => setSettings({ enableFullscreen: e.target.checked })}
        />
      )}
      <Checkbox
        id="show-jury-voting-progress"
        labelClassName="w-full"
        label={t('showJuryVotingProgressBar')}
        checked={settings.shouldShowJuryVotingProgress}
        onChange={(e) =>
          setSettings({
            shouldShowJuryVotingProgress: e.target.checked,
          })
        }
      />
      <Checkbox
        id="blur-modal-background"
        labelClassName="w-full"
        label={t('blurModalBackground')}
        checked={settings.blurModalBackground}
        onChange={(e) =>
          setSettings({
            blurModalBackground: e.target.checked,
          })
        }
      />

      <BgImageSelect />

      <Checkbox
        id="enable-winter-effects"
        labelClassName="w-full"
        label={t('enableWinterEffects')}
        checked={settings.enableWinterEffects}
        onChange={(e) =>
          setSettings({
            enableWinterEffects: e.target.checked,
          })
        }
      />
      {settings.enableWinterEffects && (
        <RangeSlider
          id="snow-fall-intensity"
          label={t('snowFallIntensity')}
          value={settings.snowFallIntensity}
          onChange={(value) => setSettings({ snowFallIntensity: value })}
          min={1}
          max={10}
          step={1}
          displayValue={false}
          minLabel={t('low')}
          maxLabel={t('high')}
        />
      )}

      <div className="sm:col-span-2">
        <h3 className="text-sm text-white font-medium middle-line after:bg-primary-800 before:bg-primary-800 my-1">
          {t('audioPreferences')}
        </h3>
        <p className="text-sm text-white/60 flex items-center gap-1">
          <InfoIcon className="size-4" /> {t('audioPreferencesHint')}
        </p>
        <div className="grid sm:grid-cols-2 grid-cols-1 gap-2">
          <Checkbox
            id="disable-all-theme-audio"
            labelClassName="w-full"
            label={t('disableAllThemeAudio')}
            checked={settings.disableAllThemeAudio}
            onChange={(e) =>
              setSettings({ disableAllThemeAudio: e.target.checked })
            }
          />
          <Checkbox
            id="hide-theme-sound-volume-hud"
            labelClassName="w-full"
            label={t('hideThemeSoundVolumeHud')}
            checked={settings.hideThemeSoundVolumeHud}
            onChange={(e) =>
              setSettings({ hideThemeSoundVolumeHud: e.target.checked })
            }
          />

          <RangeSlider
            containerClassName="ml-2 sm:pr-0 pr-2 [&>label]:mb-0"
            id="theme-sound-volume"
            label={t('themeSoundVolume')}
            value={settings.themeSoundVolume}
            onChange={(value) => setSettings({ themeSoundVolume: value })}
            min={0}
            max={100}
            step={1}
            displayValue
            minLabel="0%"
            maxLabel="100%"
          />

          {hasSimBg && (
            <RangeSlider
              containerClassName="ml-2 sm:pr-0 pr-2 [&>label]:mb-0"
              id="theme-ambience-volume"
              label={t('themeAmbienceVolume')}
              value={settings.themeAmbienceVolume}
              onChange={(value) => setSettings({ themeAmbienceVolume: value })}
              min={0}
              max={100}
              step={1}
              displayValue
              minLabel="0%"
              maxLabel="100%"
            />
          )}
        </div>
      </div>
    </>
  );
};
