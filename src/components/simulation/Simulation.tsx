import React, { Suspense } from 'react';

import { useShallow } from 'zustand/shallow';

import { useBeforeUnload } from '../../hooks/useBeforeUnload';
import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import { PhaseActions } from './PhaseActions';
import { SimulationHeader } from './SimulationHeader';

import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const QualificationResultsModal = React.lazy(
  () => import('./qualification/QualificationResultsModal'),
);
const PickQualifiersSimulation = React.lazy(
  () => import('./qualification/PickQualifiersSimulation'),
);
const WinnerConfetti = React.lazy(() => import('./WinnerConfetti'));
const WinnerModal = React.lazy(() => import('./WinnerModal'));

const Simulation = () => {
  const {
    showQualificationModal,
    isPickQualifiersMode,
    showWinnerConfetti,
    showWinnerModal,
  } = useGeneralStore(
    useShallow((state) => ({
      showQualificationModal: state.settings.showQualificationModal,
      isPickQualifiersMode: state.settings.isPickQualifiersMode,
      showWinnerConfetti: state.settings.showWinnerConfetti,
      showWinnerModal: state.settings.showWinnerModal,
    })),
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
            <Suspense fallback={null}>
              <PickQualifiersSimulation />
            </Suspense>
          ) : (
            <div className="pt-2 md:pt-1 lg:pt-0 w-full flex md:flex-row flex-col lg:gap-6 md:gap-4 gap-3">
              <Board />
              <ControlsPanel />
            </div>
          )}

          {showWinnerModal && (
            <Suspense fallback={null}>
              <WinnerModal />
            </Suspense>
          )}

          {showQualificationModal && (
            <Suspense fallback={null}>
              <QualificationResultsModal />
            </Suspense>
          )}
        </div>
      </div>

      {showWinnerConfetti && (
        <Suspense fallback={null}>
          <WinnerConfetti />
        </Suspense>
      )}
    </>
  );
};

export default Simulation;
