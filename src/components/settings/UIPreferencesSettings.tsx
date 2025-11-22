import { useTranslations } from 'next-intl';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';

import { BgImageSelect } from './BgImageSelect';
import { LanguageSelector } from './LanguageSelector';

export const UIPreferencesSettings: React.FC = () => {
  const t = useTranslations('settings.ui');
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);

  const isFullScreenSupported = document.fullscreenEnabled;

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
        id="show-reset-warning"
        labelClassName="w-full"
        label={t('confirmBeforeRestarting')}
        checked={settings.shouldShowResetWarning}
        onChange={(e) =>
          setSettings({ shouldShowResetWarning: e.target.checked })
        }
      />
      <Checkbox
        id="show-manual-televote-warning"
        labelClassName="w-full"
        label={t('warnBeforeManuallyAssigningTelevotePoints')}
        checked={settings.shouldShowManualTelevoteWarning}
        onChange={(e) =>
          setSettings({ shouldShowManualTelevoteWarning: e.target.checked })
        }
      />
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
      <BgImageSelect />
    </>
  );
};
