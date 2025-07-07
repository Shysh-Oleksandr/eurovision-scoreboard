import React from 'react';

import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import ControlsPanel from '../controlsPanel';

import { PhaseActions } from './PhaseActions';
import QualificationResultsModal from './QualificationResultsModal';
import { SimulationHeader } from './SimulationHeader';
import WinnerConfetti from './WinnerConfetti';
import WinnerModal from './WinnerModal';

import { useScoreboardStore } from '@/state/scoreboardStore';

export const Simulation = () => {
  const { eventStages } = useScoreboardStore();

  const phaseTitle = usePhaseTitle();

  if (eventStages.length === 0) {
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
