'use client';
import { useCallback } from 'react';

import { useShallow } from 'zustand/shallow';

import { useSimViewStore } from './columnLayout/simViewStore';
import { useQualifierRandom } from './columnLayout/useQualifiers';
import { useQuickRandomAction } from './columnLayout/useRandomActions';
import { useVoterInfo } from './columnLayout/useVoterInfo';
import { useFullscreenToggle } from './hooks/useFullscreenToggle';
import { useSimulationActions } from './hooks/useSimulationActions';

import { useHasFinePointer } from '@/hooks/useHasFinePointer';
import { StageId } from '@/models';
import { IS_NATIVE_APP } from '@/native/platform';
import { useShortcut, useShortcutScope } from '@/shortcuts/registry';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useSettingsModalStore } from '@/state/settingsModalStore';

interface SimulationShortcutsProps {
  /** The column layout (minimal view exists there only). */
  isColumnLayout: boolean;
  /** The jury scale reveal's own controls take Random, Finish and Continue. */
  isScaleRevealActive: boolean;
}

/**
 * The simulation's keyboard shortcuts that don't belong to one button:
 * registered once here, whichever of the column, sheet or stripe shows the
 * buttons (docs/keyboard-shortcuts.md). Continue and Stats are registered
 * by the results panels, Share by each layout, Start by the stage modal.
 * Each runs only while its button would be there and work.
 */
const SimulationShortcuts = ({
  isColumnLayout,
  isScaleRevealActive,
}: SimulationShortcutsProps) => {
  useShortcutScope();

  const { hasStage, isOver, isQualifiersStage } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return {
        hasStage: !!stage,
        isOver: !!stage?.isOver,
        isQualifiersStage:
          !!stage && stage.id.toUpperCase() !== StageId.GF.toUpperCase(),
      };
    }),
  );
  const { isPresenting, presentationModeEnabled, isPickQualifiersMode } =
    useGeneralStore(
      useShallow((state) => ({
        isPresenting: state.presentationSettings.isPresenting,
        presentationModeEnabled: state.settings.presentationModeEnabled,
        isPickQualifiersMode: state.settings.isPickQualifiersMode,
      })),
    );
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );
  const isPickingQualifiers = isPickQualifiersMode && isQualifiersStage;

  // ── At random ────────────────────────────────────────────────────────────
  const voter = useVoterInfo();
  const { actions, quick } = useQuickRandomAction(voter);
  const qualifierRandom = useQualifierRandom();
  const finishJuryVotingRandomly = useScoreboardStore(
    (state) => state.finishJuryVotingRandomly,
  );
  const finishTelevoteVotingRandomly = useScoreboardStore(
    (state) => state.finishTelevoteVotingRandomly,
  );

  // The hand controls are there: a stage runs, nobody presents.
  const canVote = hasStage && !isOver && !isPresenting && !isScaleRevealActive;
  const runScope = (id: 'next' | 'voter') =>
    actions.find((action) => action.id === id)?.run();

  useShortcut(
    'random',
    () => (isPickingQualifiers ? qualifierRandom.next() : quick.run()),
    canVote,
  );
  useShortcut(
    'randomNext',
    () => (isPickingQualifiers ? qualifierRandom.next() : runScope('next')),
    canVote,
  );
  useShortcut(
    'randomVoter',
    () => runScope('voter'),
    canVote && !isPickingQualifiers && voter.phase === 'jury',
  );

  const finishAll = useCallback(() => {
    // Read fresh: the round may have changed since the last render.
    const stage = useScoreboardStore.getState().getCurrentStage();

    if (!stage || stage.isOver) return;

    if (isPickingQualifiers) qualifierRandom.all();
    else if (stage.isJuryVoting) finishJuryVotingRandomly();
    else finishTelevoteVotingRandomly();
  }, [
    isPickingQualifiers,
    qualifierRandom,
    finishJuryVotingRandomly,
    finishTelevoteVotingRandomly,
  ]);

  useShortcut('randomAll', finishAll, canVote);

  // ── Presentation and view ────────────────────────────────────────────────
  useShortcut(
    'present',
    () => setPresentationSettings({ isPresenting: !isPresenting }),
    hasStage &&
      !isOver &&
      !isScaleRevealActive &&
      (presentationModeEnabled || isPresenting),
  );

  const toggleMinimalView = useCallback(() => {
    const { minimalView, setMinimalView } = useSimViewStore.getState();

    setMinimalView(!minimalView);
  }, []);

  useShortcut('minimalView', toggleMinimalView, isColumnLayout);

  const fullscreen = useFullscreenToggle();

  useShortcut('fullscreen', fullscreen.toggle, fullscreen.supported);

  // ── Header actions ───────────────────────────────────────────────────────
  const { canUndo, undo, confirmRestart, cancel, openSetup } =
    useSimulationActions();

  useShortcut('undo', undo, canUndo);
  useShortcut('restart', confirmRestart, hasStage);
  useShortcut('setup', openSetup);
  useShortcut('cancel', cancel, hasStage);

  // ? opens the shortcuts' own settings, which exist with a mouse or trackpad.
  const hasFinePointer = useHasFinePointer();
  const openShortcutsSettings = useCallback(
    () => useSettingsModalStore.getState().openAt('shortcuts'),
    [],
  );

  useShortcut(
    'shortcutsHelp',
    openShortcutsSettings,
    hasFinePointer && !IS_NATIVE_APP,
  );

  return null;
};

export default SimulationShortcuts;
