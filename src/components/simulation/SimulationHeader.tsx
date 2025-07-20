import React from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { getHostingCountryLogoForYear } from '../../theme/themes';
import Button from '../common/Button';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { UndoIcon } from '@/assets/icons/UndoIcon';
import { useScoreboardStore } from '@/state/scoreboardStore';

interface SimulationHeaderProps {
  phaseTitle: string;
}

export const SimulationHeader = ({ phaseTitle }: SimulationHeaderProps) => {
  const year = useGeneralStore((state) => state.year);
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );

  const triggerRestartEvent = useScoreboardStore(
    (state) => state.triggerRestartEvent,
  );
  const { undo, pastStates } = useScoreboardStore.temporal.getState();

  const canUndo =
    pastStates.length > 0 && !!pastStates[pastStates.length - 1].currentStageId;

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <img
          src={getHostingCountryLogoForYear(year)}
          alt="Hosting country logo"
          className="w-10 h-10"
          width={40}
          height={40}
        />
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
            triggerRestartEvent();
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
