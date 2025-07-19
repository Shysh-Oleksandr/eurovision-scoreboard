import React from 'react';

import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import { PhaseActions } from './PhaseActions';
import QualificationResultsModal from './QualificationResultsModal';
import { SimulationHeader } from './SimulationHeader';
import WinnerConfetti from './WinnerConfetti';
import WinnerModal from './WinnerModal';

import { useScoreboardStore } from '@/state/scoreboardStore';

export const Simulation = () => {
  const eventStages = useScoreboardStore((state) => state.eventStages);

  const phaseTitle = usePhaseTitle();

  if (eventStages.length === 0) {
    return null;
  }

  return (
    <>
      <WinnerConfetti />

      <div className="lg:pt-8 md:pt-6 pt-4">
        <div className="sm:w-[min(90%,1024px)] xl:w-[min(88%,1100px)] w-[93%] mx-auto lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2">
          <SimulationHeader phaseTitle={phaseTitle} />
          <PhaseActions />
          <div className="pt-2 w-full flex md:flex-row flex-col lg:gap-6 md:gap-4 gap-3">
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
