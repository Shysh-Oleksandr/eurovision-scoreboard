import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';
import { CollapsibleSection } from '../common/CollapsibleSection';

import { PointsSystemSelection } from './pointsSystem/PointsSystemSelection';

export const GeneralSettings: React.FC = () => {
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);

  const isFullScreenSupported = document.fullscreenEnabled;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="flex flex-col gap-4">
      <CollapsibleSection
        title="UI Preferences"
        defaultExpanded
        contentClassName="grid sm:grid-cols-2 grid-cols-1 gap-1"
      >
        <Checkbox
          id="show-place-number"
          labelClassName="w-full"
          label="Always show rankings"
          checked={settings.alwaysShowRankings}
          onChange={(e) =>
            setSettings({ alwaysShowRankings: e.target.checked })
          }
        />
        <Checkbox
          id="show-rank-change-indicator"
          labelClassName="w-full"
          label="Show rank change indicator"
          checked={settings.showRankChangeIndicator}
          onChange={(e) =>
            setSettings({ showRankChangeIndicator: e.target.checked })
          }
        />
        <Checkbox
          id="show-qualification-modal"
          labelClassName="w-full"
          label="Show qualifiers popup"
          checked={settings.showQualificationModal}
          onChange={(e) =>
            setSettings({ showQualificationModal: e.target.checked })
          }
        />
        <Checkbox
          id="show-winner-modal"
          labelClassName="w-full"
          label="Show winner popup"
          checked={settings.showWinnerModal}
          onChange={(e) => setSettings({ showWinnerModal: e.target.checked })}
        />
        <Checkbox
          id="show-winner-confetti"
          labelClassName="w-full"
          label="Show winner confetti"
          checked={settings.showWinnerConfetti}
          onChange={(e) =>
            setSettings({ showWinnerConfetti: e.target.checked })
          }
        />
        {isFullScreenSupported && (
          <Checkbox
            id="enable-fullscreen"
            labelClassName="w-full"
            label="Enable fullscreen mode"
            checked={settings.enableFullscreen}
            onChange={(e) =>
              setSettings({ enableFullscreen: e.target.checked })
            }
          />
        )}
        {/* iOS doesn't support beforeunload event */}
        {!isIOS && (
          <Checkbox
            id="show-before-unload-warning"
            labelClassName="w-full"
            label="Confirm before leaving"
            checked={settings.shouldShowBeforeUnloadWarning}
            onChange={(e) =>
              setSettings({ shouldShowBeforeUnloadWarning: e.target.checked })
            }
          />
        )}
        <Checkbox
          id="show-reset-warning"
          labelClassName="w-full"
          label="Confirm before restarting"
          checked={settings.shouldShowResetWarning}
          onChange={(e) =>
            setSettings({ shouldShowResetWarning: e.target.checked })
          }
        />
        <Checkbox
          id="show-manual-televote-warning"
          labelClassName="w-full"
          label="Show warning before manually assigning televote points"
          checked={settings.shouldShowManualTelevoteWarning}
          onChange={(e) =>
            setSettings({ shouldShowManualTelevoteWarning: e.target.checked })
          }
        />
      </CollapsibleSection>
      <CollapsibleSection title="Voting" defaultExpanded>
        <PointsSystemSelection />
      </CollapsibleSection>
    </div>
  );
};
