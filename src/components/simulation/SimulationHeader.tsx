import React, { useState, Suspense } from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { getHostingCountryLogo } from '../../theme/hosting';
import Button from '../common/Button';

const ShareResultsModal = React.lazy(() => import('./share/ShareResultsModal'));

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { ShareIcon } from '@/assets/icons/ShareIcon';
import { SlidersIcon } from '@/assets/icons/SlidersIcon';
import { UndoIcon } from '@/assets/icons/UndoIcon';
import { useScoreboardStore } from '@/state/scoreboardStore';

interface SimulationHeaderProps {
  phaseTitle: string;
}

export const SimulationHeader = ({ phaseTitle }: SimulationHeaderProps) => {
  const showHostingCountryLogo = useGeneralStore(
    (state) => state.settings.showHostingCountryLogo,
  );
  const getHostingCountry = useGeneralStore((state) => state.getHostingCountry);
  const shouldShowResetWarning = useGeneralStore(
    (state) => state.settings.shouldShowResetWarning,
  );
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );

  const triggerRestartEvent = useScoreboardStore(
    (state) => state.triggerRestartEvent,
  );
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const currentStageId = useScoreboardStore((state) => state.currentStageId);
  const { undo, pastStates } = useScoreboardStore.temporal.getState();

  const canUndo =
    pastStates.length > 0 &&
    !!pastStates[pastStates.length - 1].currentStageId &&
    (!viewedStageId || viewedStageId === currentStageId);

  const { logo, isExisting } = getHostingCountryLogo(getHostingCountry());

  const [showShareResultsModal, setShowShareResultsModal] = useState(false);

  const buttonClassName =
    'xs:!p-3 !py-2 !flex-1 justify-center items-center flex xs:!flex-none';

  return (
    <>
      <Suspense fallback={null}>
        <ShareResultsModal
          isOpen={showShareResultsModal}
          onClose={() => setShowShareResultsModal(false)}
        />
      </Suspense>

      <div className="flex flex-col xs:flex-row justify-between xs:gap-1.5 gap-2 xs:items-center mb-1 sm:mb-2 md:mb-3">
        <div className="flex items-center gap-2">
          {showHostingCountryLogo && (
            <img
              src={logo}
              alt="Hosting country logo"
              className={`flex-none rounded-sm ${
                isExisting
                  ? 'w-10 h-10 overflow-visible'
                  : 'w-9 h-7 object-cover mr-1'
              }`}
              width={36}
              height={28}
            />
          )}
          <h2
            className="sm:text-xl text-lg font-bold text-white"
            style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
          >
            {phaseTitle}
          </h2>
        </div>

        <div className="flex gap-2 xs:w-auto w-full">
          <Button
            onClick={() => undo()}
            className={buttonClassName}
            aria-label="Undo"
            title="Undo"
            disabled={!canUndo}
            variant="tertiary"
          >
            <UndoIcon className="w-6 h-6" />
          </Button>
          <Button
            onClick={() => {
              if (shouldShowResetWarning) {
                if (confirm('Are you sure you want to restart?')) {
                  triggerRestartEvent();
                }
              } else {
                triggerRestartEvent();
              }
            }}
            className={buttonClassName}
            aria-label="Restart"
            title="Restart"
            variant="tertiary"
          >
            <RestartIcon className="w-6 h-6" />
          </Button>
          <Button
            className={buttonClassName}
            variant="tertiary"
            onClick={() => setShowShareResultsModal(true)}
            Icon={<ShareIcon className="w-6 h-6" />}
            aria-label="Share"
            title="Share"
          />
          <Button
            onClick={() => setEventSetupModalOpen(true)}
            Icon={<SlidersIcon className="w-[24px] h-[24px]" />}
            aria-label="Setup"
            title="Setup"
            className={`${buttonClassName} xs:!px-6 xs:!py-2`}
          />
        </div>
      </div>
    </>
  );
};
