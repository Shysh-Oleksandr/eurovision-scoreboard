import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { useStore } from 'zustand';

import { useConfirmation } from '@/hooks/useConfirmation';
import { playHaptic } from '@/native/haptics';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * The simulation-wide actions the header offers (undo, restart, cancel, open
 * setup), shared by the classic header, the column layout's ⋯ menu and the
 * keyboard shortcuts (`SimulationShortcuts`), so all keep the same
 * confirmations and haptics.
 */
export const useSimulationActions = () => {
  const t = useTranslations('simulation.header');
  const { confirm } = useConfirmation();

  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );
  const triggerRestartEvent = useScoreboardStore(
    (state) => state.triggerRestartEvent,
  );
  const leaveEvent = useScoreboardStore((state) => state.leaveEvent);
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const currentStageId = useScoreboardStore((state) => state.currentStageId);

  // Subscribe to the undo availability instead of reading `pastStates` during
  // render: memoized headers don't re-render on every award, so a
  // non-reactive read would leave the undo button stale.
  const hasUndoablePast = useStore(
    useScoreboardStore.temporal,
    (state) =>
      state.pastStates.length > 0 &&
      !!state.pastStates[state.pastStates.length - 1].currentStageId,
  );

  const canUndo =
    hasUndoablePast && (!viewedStageId || viewedStageId === currentStageId);

  const undo = useCallback(() => {
    useScoreboardStore.temporal.getState().undo();
    useScoreboardStore.getState().clearReveal();
    playHaptic({ id: 'undo' });
  }, []);

  const cancel = useCallback(() => {
    confirm({
      key: 'cancel-simulation',
      title: t('cancelSimulationConfirmation'),
      onConfirm: () => {
        leaveEvent();
      },
    });
  }, [confirm, leaveEvent, t]);

  const openSetup = useCallback(
    () => setEventSetupModalOpen(true),
    [setEventSetupModalOpen],
  );

  // From the keyboard, one stray R would wipe the run: ask first (Enter
  // confirms). The ⋯ menu's Restart already takes two clicks.
  const confirmRestart = useCallback(() => {
    confirm({
      key: 'restart-simulation',
      title: t('restartConfirmation'),
      description: t('restartConfirmationDescription'),
      onConfirm: triggerRestartEvent,
    });
  }, [confirm, t, triggerRestartEvent]);

  return {
    canUndo,
    undo,
    restart: triggerRestartEvent,
    confirmRestart,
    cancel,
    openSetup,
  };
};
