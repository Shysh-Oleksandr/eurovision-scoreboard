import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';
import { CollapsibleSection } from '../common/CollapsibleSection';

export const GeneralSettings: React.FC = () => {
  const alwaysShowRankings = useGeneralStore(
    (state) => state.alwaysShowRankings,
  );
  const setAlwaysShowRankings = useGeneralStore(
    (state) => state.setAlwaysShowRankings,
  );
  const showQualificationModal = useGeneralStore(
    (state) => state.showQualificationModal,
  );
  const setShowQualificationModal = useGeneralStore(
    (state) => state.setShowQualificationModal,
  );
  const showWinnerModal = useGeneralStore((state) => state.showWinnerModal);
  const setShowWinnerModal = useGeneralStore(
    (state) => state.setShowWinnerModal,
  );
  const showWinnerConfetti = useGeneralStore(
    (state) => state.showWinnerConfetti,
  );
  const setShowWinnerConfetti = useGeneralStore(
    (state) => state.setShowWinnerConfetti,
  );
  const enableFullscreen = useGeneralStore((state) => state.enableFullscreen);
  const setEnableFullscreen = useGeneralStore(
    (state) => state.setEnableFullscreen,
  );
  const shouldShowBeforeUnloadWarning = useGeneralStore(
    (state) => state.shouldShowBeforeUnloadWarning,
  );
  const setShouldShowBeforeUnloadWarning = useGeneralStore(
    (state) => state.setShouldShowBeforeUnloadWarning,
  );
  const shouldShowResetWarning = useGeneralStore(
    (state) => state.shouldShowResetWarning,
  );
  const setShouldShowResetWarning = useGeneralStore(
    (state) => state.setShouldShowResetWarning,
  );

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
          checked={alwaysShowRankings}
          onChange={(e) => setAlwaysShowRankings(e.target.checked)}
        />
        <Checkbox
          id="show-qualification-modal"
          labelClassName="w-full"
          label="Show qualifiers popup"
          checked={showQualificationModal}
          onChange={(e) => setShowQualificationModal(e.target.checked)}
        />
        <Checkbox
          id="show-winner-modal"
          labelClassName="w-full"
          label="Show winner popup"
          checked={showWinnerModal}
          onChange={(e) => setShowWinnerModal(e.target.checked)}
        />
        <Checkbox
          id="show-winner-confetti"
          labelClassName="w-full"
          label="Show winner confetti"
          checked={showWinnerConfetti}
          onChange={(e) => setShowWinnerConfetti(e.target.checked)}
        />
        {isFullScreenSupported && (
          <Checkbox
            id="enable-fullscreen"
            labelClassName="w-full"
            label="Enable fullscreen mode"
            checked={enableFullscreen}
            onChange={(e) => setEnableFullscreen(e.target.checked)}
          />
        )}
        {/* iOS doesn't support beforeunload event */}
        {!isIOS && (
          <Checkbox
            id="show-before-unload-warning"
            labelClassName="w-full"
            label="Confirm before leaving"
            checked={shouldShowBeforeUnloadWarning}
            onChange={(e) => setShouldShowBeforeUnloadWarning(e.target.checked)}
          />
        )}
        <Checkbox
          id="show-reset-warning"
          labelClassName="w-full"
          label="Confirm before restarting"
          checked={shouldShowResetWarning}
          onChange={(e) => setShouldShowResetWarning(e.target.checked)}
        />
      </CollapsibleSection>
    </div>
  );
};
