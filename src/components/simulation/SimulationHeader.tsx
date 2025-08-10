import React from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { getHostingCountryLogo } from '../../theme/hosting';
import Button from '../common/Button';

import { RestartIcon } from '@/assets/icons/RestartIcon';
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

  return (
    <div className="flex justify-between items-center mb-4">
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
        <h2 className="sm:text-xl text-lg font-bold text-white">
          {phaseTitle}
        </h2>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => undo()}
          className="!p-3"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
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
          className="!p-3"
          aria-label="Restart"
          title="Restart"
        >
          <RestartIcon className="w-6 h-6" />
        </Button>
        <Button label="Setup" onClick={() => setEventSetupModalOpen(true)} />
      </div>
    </div>
  );
};
