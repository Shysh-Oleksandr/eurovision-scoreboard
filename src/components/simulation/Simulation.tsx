import React from 'react';

import { useBeforeUnload } from '../../hooks/useBeforeUnload';
import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import { PhaseActions } from './PhaseActions';
import { PickQualifiersSimulation } from './qualification/PickQualifiersSimulation';
import QualificationResultsModal from './qualification/QualificationResultsModal';
import { SimulationHeader } from './SimulationHeader';
import WinnerConfetti from './WinnerConfetti';
import WinnerModal from './WinnerModal';

import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const Simulation = () => {
  const isPickQualifiersMode = useGeneralStore(
    (state) => state.settings.isPickQualifiersMode,
  );

  const eventStages = useScoreboardStore((state) => state.eventStages);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const currentStage = getCurrentStage();

  const isSemiFinalStage = currentStage?.id !== StageId.GF;

  const phaseTitle = usePhaseTitle();

  useBeforeUnload();

  if (eventStages.length === 0) {
    return null;
  }

  return (
    <>
      <div className="lg:pt-8 md:pt-6 pt-4">
        <div className="sm:w-[min(90%,1024px)] xl:w-[min(88%,1100px)] w-[93%] mx-auto lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2">
          <SimulationHeader phaseTitle={phaseTitle} />
          <PhaseActions />
          {isPickQualifiersMode && isSemiFinalStage ? (
            <PickQualifiersSimulation />
          ) : (
            <div className="pt-2 w-full flex md:flex-row flex-col lg:gap-6 md:gap-4 gap-3">
              <Board />
              <ControlsPanel />
            </div>
          )}

          <WinnerModal />
          <QualificationResultsModal />
        </div>
      </div>

      <WinnerConfetti />
    </>
  );
};
