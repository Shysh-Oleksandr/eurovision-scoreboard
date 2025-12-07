'use client';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import { PhaseActions } from './PhaseActions';
import { SimulationHeader } from './SimulationHeader';

import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const QualificationResultsModal = dynamic(
  () => import('./qualification/QualificationResultsModal'),
  {
    ssr: false,
  },
);
const PresentationPanel = dynamic(
  () => import('../presentationPanel/PresentationPanel'),
  {
    ssr: false,
  },
);
const PickQualifiersSimulation = dynamic(
  () => import('./qualification/PickQualifiersSimulation'),
  {
    ssr: false,
  },
);
const WinnerConfetti = dynamic(() => import('./WinnerConfetti'), {
  ssr: false,
});
const WinnerModal = dynamic(() => import('./WinnerModal'), {
  ssr: false,
});

const Simulation = () => {
  const {
    showQualificationModal,
    isPickQualifiersMode,
    showWinnerConfetti,
    showWinnerModal,
    presentationModeEnabled,
  } = useGeneralStore(
    useShallow((state) => ({
      showQualificationModal: state.settings.showQualificationModal,
      isPickQualifiersMode: state.settings.isPickQualifiersMode,
      showWinnerConfetti: state.settings.showWinnerConfetti,
      showWinnerModal: state.settings.showWinnerModal,
      presentationModeEnabled: state.settings.presentationModeEnabled,
    })),
  );

  const eventStages = useScoreboardStore((state) => state.eventStages);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const currentStage = getCurrentStage();

  const isSemiFinalStage = currentStage?.id !== StageId.GF;

  const phaseTitle = usePhaseTitle();

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
              {!currentStage?.isOver && (
                <div className="mb-[6px] md:min-w-[180px] w-full md:max-w-[240px] lg:max-w-[258px] xl:max-w-[335px] flex md:flex-col xs:flex-row flex-col gap-2">
                  <ControlsPanel />
                  {presentationModeEnabled && <PresentationPanel />}
                </div>
              )}
            </div>
          )}

          {showWinnerModal && <WinnerModal />}

          {showQualificationModal && <QualificationResultsModal />}
        </div>
      </div>

      {showWinnerConfetti && <WinnerConfetti />}
    </>
  );
};

export default Simulation;
