import React, { Suspense } from 'react';

import { useBeforeUnload } from '../../hooks/useBeforeUnload';
import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import { PhaseActions } from './PhaseActions';
import { PickQualifiersSimulation } from './qualification/PickQualifiersSimulation';
import { SimulationHeader } from './SimulationHeader';
import WinnerConfetti from './WinnerConfetti';
import WinnerModal from './WinnerModal';

import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const QualificationResultsModal = React.lazy(
  () => import('./qualification/QualificationResultsModal'),
);

export const Simulation = () => {
  const showQualificationModal = useGeneralStore(
    (state) => state.settings.showQualificationModal,
  );

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
      <div className="lg:pt-8 md:pt-6 xs:pt-4 pt-2">
        <div className="sm:w-[min(90%,1024px)] xl:w-[min(88%,1100px)] w-[93%] mx-auto lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2">
          <SimulationHeader phaseTitle={phaseTitle} />
          <PhaseActions />
          {isPickQualifiersMode && isSemiFinalStage ? (
            <PickQualifiersSimulation />
          ) : (
            <div className="pt-2 md:pt-1 lg:pt-0 w-full flex md:flex-row flex-col lg:gap-6 md:gap-4 gap-3">
              <Board />
              <ControlsPanel />
            </div>
          )}

          <WinnerModal />

          {showQualificationModal && (
            <Suspense fallback={null}>
              <QualificationResultsModal />
            </Suspense>
          )}
        </div>
      </div>

      <WinnerConfetti />
    </>
  );
};
