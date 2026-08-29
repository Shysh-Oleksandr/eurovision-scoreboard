'use client';

import { useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import { usePhaseTitle } from '../../hooks/usePhaseTitle';
import Board from '../board/Board';
import BoardHeader from '../board/BoardHeader';
import ControlsPanel from '../controlsPanel/ControlsPanel';

import FinalTelevoteReveal from './FinalTelevoteReveal';
import { PhaseActions } from './PhaseActions';
import { SimulationHeader } from './SimulationHeader';

import {
  importJuryScaleRevealSimulation,
  importPickQualifiersSimulation,
  importPresentationPanel,
  importQualificationResultsModal,
  importWinnerConfetti,
  importWinnerModal,
} from '@/hooks/simulationChunkImports';
import { StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { getFinalRevealInfo } from '@/state/scoreboard/helpers';
import { isJuryScaleRevealActive } from '@/state/scoreboard/juryScaleReveal';
import { useScoreboardStore } from '@/state/scoreboardStore';
import {
  stopSimulationBackgroundThemeSound,
  syncSimulationBackgroundThemeSound,
} from '@/theme/simulationBackgroundThemeSound';

const QualificationResultsModal = dynamic(importQualificationResultsModal, {
  ssr: false,
});
const PresentationPanel = dynamic(importPresentationPanel, {
  ssr: false,
  // Mirrors the panel's outer structure and min-height so the layout does
  // not shift when the chunk arrives on a slow connection.
  loading: () => (
    <div className="w-full">
      <div className="min-h-[120px] bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-[10px]" />
    </div>
  ),
});
const PickQualifiersSimulation = dynamic(importPickQualifiersSimulation, {
  ssr: false,
});
const JuryScaleRevealSimulation = dynamic(importJuryScaleRevealSimulation, {
  ssr: false,
});
const WinnerConfetti = dynamic(importWinnerConfetti, {
  ssr: false,
});
const WinnerModal = dynamic(importWinnerModal, {
  ssr: false,
});

const REVEAL_TRIGGER_DELAY_MS = 3500;

/**
 * Mounts the qualification-results modal only once the first qualification
 * result is ready, and does so in a deferred effect (one task after the
 * stage-end commit) so the modal's mount cost never lands inside the
 * televote-finish transition commit. Once mounted it stays mounted, so the
 * modal's own open/close animations and per-stage timers are untouched — the
 * modal itself opens after its usual 3.4s `openDelay`.
 */
const QualificationResultsModalGate = () => {
  const showQualificationResults = useScoreboardStore(
    (state) => state.showQualificationResults,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!showQualificationResults || mounted) return;

    const timerId = setTimeout(() => setMounted(true), 0);

    return () => clearTimeout(timerId);
  }, [showQualificationResults, mounted]);

  if (!mounted) return null;

  return <QualificationResultsModal />;
};

const Simulation = () => {
  const {
    showQualificationModal,
    isPickQualifiersMode,
    showWinnerConfetti,
    showWinnerModal,
    presentationModeEnabled,
    enableJuryScaleReveal,
  } = useGeneralStore(
    useShallow((state) => ({
      showQualificationModal: state.settings.showQualificationModal,
      isPickQualifiersMode: state.settings.isPickQualifiersMode,
      showWinnerConfetti: state.settings.showWinnerConfetti,
      showWinnerModal: state.settings.showWinnerModal,
      presentationModeEnabled: state.settings.presentationModeEnabled,
      enableJuryScaleReveal: state.settings.enableJuryScaleReveal,
    })),
  );

  const eventStages = useScoreboardStore((state) => state.eventStages);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const {
    juryScaleReveal,
    votingCountryIndex,
    votingPointsIndex,
    viewedStageId,
    showAllParticipants,
  } = useScoreboardStore(
    useShallow((state) => ({
      juryScaleReveal: state.juryScaleReveal,
      votingCountryIndex: state.votingCountryIndex,
      votingPointsIndex: state.votingPointsIndex,
      viewedStageId: state.viewedStageId,
      showAllParticipants: state.showAllParticipants,
    })),
  );
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

  const isScaleRevealActive = isJuryScaleRevealActive({
    stage: currentStage,
    enableJuryScaleReveal,
    isPickQualifiersMode,
    juryScaleReveal,
    votingCountryIndex,
    votingPointsIndex,
    viewedStageId,
    showAllParticipants,
  });

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
          ) : isScaleRevealActive ? (
            <JuryScaleRevealSimulation />
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

          {showQualificationModal && <QualificationResultsModalGate />}
        </div>
      </div>

      {showWinnerConfetti &&
        (isRevealAnimationComplete || !showRevealPanel) && <WinnerConfetti />}
    </>
  );
};

export default Simulation;
