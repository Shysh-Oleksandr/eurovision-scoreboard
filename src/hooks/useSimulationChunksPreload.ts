import { useEffect } from 'react';

import {
  importJuryScaleRevealSimulation,
  importPickQualifiersSimulation,
  importPostSetupModal,
  importPresentationPanel,
  importQualificationResultsModal,
  importSimulation,
  importWinnerConfetti,
  importWinnerModal,
} from './simulationChunkImports';

let didPreload = false;

/**
 * Warms the lazy chunks the simulation flow needs — the post-setup modal
 * behind the ПОЧАТИ tap, the board/GSAP batch behind the start-stage tap, and
 * the reveal modals shown at stage end — while the user is still on the setup
 * screen. On Slow 4G those fetches otherwise serialize behind each tap
 * (~0.5–1.3 s each). Idle-time only, one-shot per page load; each thunk
 * resolves to the same module instance the `next/dynamic` wrappers use, so
 * this only moves the network/parse cost, it duplicates nothing.
 */
export const useSimulationChunksPreload = () => {
  useEffect(() => {
    if (didPreload) return;
    didPreload = true;

    const preload = () => {
      void importPostSetupModal();
      void import('gsap');
      void import('@gsap/react');
      void importSimulation();
      void importPresentationPanel();
      void importQualificationResultsModal();
      void importPickQualifiersSimulation();
      void importJuryScaleRevealSimulation();
      void importWinnerModal();
      void importWinnerConfetti();
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preload, { timeout: 4000 });
    } else {
      setTimeout(preload, 2500);
    }
  }, []);
};
