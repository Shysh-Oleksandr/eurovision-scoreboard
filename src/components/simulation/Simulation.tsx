'use client';

import { useEffect, useRef } from 'react';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import BoardHeader from '../board/BoardHeader';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import FinalTelevoteReveal from './FinalTelevoteReveal';
import { PhaseActions } from './PhaseActions';
import { SimulationHeader } from './SimulationHeader';

import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { getFinalRevealInfo } from '@/state/scoreboard/helpers';
import { useScoreboardStore } from '@/state/scoreboardStore';
import {
  stopSimulationBackgroundThemeSound,
  syncSimulationBackgroundThemeSound,
} from '@/theme/simulationBackgroundThemeSound';

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

const REVEAL_TRIGGER_DELAY_MS = 3500;

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
  const enableFinalReveal = useGeneralStore(
    (state) => state.settings.enableFinalReveal,
  );
  const themeAmbienceVolume = useGeneralStore(
    (state) => state.settings.themeAmbienceVolume,
  );
  const disableAllThemeAudio = useGeneralStore(
    (state) => state.settings.disableAllThemeAudio,
  );
  const simulationBackgroundUrl = useGeneralStore(
    (state) => state.customTheme?.themeSounds?.simulationBackground?.url,
  );

  useEffect(() => {
    syncSimulationBackgroundThemeSound(eventStages.length > 0);
  }, [
    eventStages.length,
    themeAmbienceVolume,
    simulationBackgroundUrl,
    disableAllThemeAudio,
  ]);

  useEffect(() => {
    return () => {
      stopSimulationBackgroundThemeSound();
    };
  }, []);

  const currentStage = getCurrentStage();

  const isSemiFinalStage =
    currentStage?.id.toUpperCase() !== StageId.GF.toUpperCase();

  const phaseTitle = usePhaseTitle();

  // ── Final televote reveal ─────────────────────────────────────────────────

  // Derive the single pending country code when we should show the reveal panel.
  // `getFinalRevealInfo` is the shared source of truth (also used by the
  // `giveTelevotePoints` guard) so the trigger and the guard never disagree.
  const lastPendingCountryCode =
    getFinalRevealInfo(currentStage, enableFinalReveal)?.lastCode ?? null;

  const revealData = useScoreboardStore((state) => state.revealData);
  const isRevealAnimationComplete = useScoreboardStore(
    (state) => state.isRevealAnimationComplete,
  );
  const setRevealData = useScoreboardStore((state) => state.setRevealData);
  const setIsRevealAnimationComplete = useScoreboardStore(
    (state) => state.setIsRevealAnimationComplete,
  );

  const triggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastPendingCountryCode || revealData) return;

    triggerTimerRef.current = setTimeout(() => {
      // Re-check against fresh state before committing: the condition may have
      // changed during the delay (e.g. the stage advanced).
      const stage = useScoreboardStore.getState().getCurrentStage();
      const info = getFinalRevealInfo(stage, enableFinalReveal);

      if (!info) return;

      setRevealData({
        leaderCode: info.leaderCode,
        lastCode: info.lastCode,
        pointsNeeded: info.pointsNeeded,
      });
    }, REVEAL_TRIGGER_DELAY_MS);

    return () => {
      if (triggerTimerRef.current) {
        clearTimeout(triggerTimerRef.current);
      }
    };
  }, [lastPendingCountryCode, revealData, setRevealData, enableFinalReveal]);

  const handleRevealComplete = () => {
    setIsRevealAnimationComplete(true);
  };

  const handleBackToScoreboard = () => {
    setRevealData(null);
    setIsRevealAnimationComplete(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (eventStages.length === 0) {
    return null;
  }

  const showRevealPanel = revealData !== null;

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
              <div className="flex-1 flex flex-col min-w-0">
                <BoardHeader
                  revealActive={showRevealPanel}
                  revealAnimationComplete={isRevealAnimationComplete}
                  onBackToScoreboard={handleBackToScoreboard}
                />
                {showRevealPanel && revealData ? (
                  <FinalTelevoteReveal
                    leaderCountryCode={revealData.leaderCode}
                    lastCountryCode={revealData.lastCode}
                    pointsNeeded={revealData.pointsNeeded}
                    onRevealComplete={handleRevealComplete}
                  />
                ) : (
                  <Board />
                )}
              </div>
              {!currentStage?.isOver && (
                <div className="mb-[6px] md:min-w-[180px] w-full md:max-w-[240px] lg:max-w-[258px] xl:max-w-[335px] flex md:flex-col xs:flex-row flex-col gap-2">
                  <ControlsPanel />
                  {presentationModeEnabled && <PresentationPanel />}
                </div>
              )}
            </div>
          )}

          {showWinnerModal &&
            (isRevealAnimationComplete || !showRevealPanel) && <WinnerModal />}

          {showQualificationModal && <QualificationResultsModal />}
        </div>
      </div>

      {showWinnerConfetti &&
        (isRevealAnimationComplete || !showRevealPanel) && <WinnerConfetti />}
    </>
  );
};

export default Simulation;
