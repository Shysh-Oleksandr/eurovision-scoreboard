import React from 'react';

import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board';
import ControlsPanel from '../controlsPanel';
import QualificationResultsModal from '../QualificationResultsModal';
import WinnerModal from '../WinnerModal';

import { PhaseActions } from './PhaseActions';
import { SimulationHeader } from './SimulationHeader';
import WinnerConfetti from './WinnerConfetti';

import { EventPhase } from '@/models';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const Simulation = () => {
  const { eventPhase } = useScoreboardStore();

  const phaseTitle = usePhaseTitle();

  if (eventPhase === EventPhase.COUNTRY_SELECTION) {
    return null;
  }

  return (
    <>
      <WinnerConfetti />

      <div className="lg:pt-8 md:pt-6 pt-4">
        <div className="xl:px-[15%] lg:px-[10%] md:px-[6%] sm:px-8 px-4 lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2 w-full">
          <SimulationHeader phaseTitle={phaseTitle} />
          <PhaseActions />
          <div className="pt-2 w-full flex lg:gap-x-6 md:gap-x-4 gap-x-3 md:flex-row flex-col">
            <Board />
            <ControlsPanel />
          </div>

          <WinnerModal />
          <QualificationResultsModal />
        </div>
      </div>
    </>
  );
};
