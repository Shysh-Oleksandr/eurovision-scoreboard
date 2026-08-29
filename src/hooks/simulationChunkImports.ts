/**
 * Shared dynamic-import thunks for the simulation flow.
 *
 * Turbopack builds a chunk group per `import()` call site, so a preloading
 * `import()` written elsewhere warms the shared chunks but not the
 * group-specific ones — the tap still pays a fetch. The `dynamic()` wrappers
 * and the idle preloader (`useSimulationChunksPreload`) therefore must go
 * through these same thunks, so the preload warms exactly the chunks the
 * wrappers later request.
 */
export const importSimulation = () =>
  import('@/components/simulation/Simulation');

export const importPostSetupModal = () =>
  import('@/components/setup/post-setup/PostSetupModal');

export const importPresentationPanel = () =>
  import('@/components/presentationPanel/PresentationPanel');

export const importQualificationResultsModal = () =>
  import('@/components/simulation/qualification/QualificationResultsModal');

export const importPickQualifiersSimulation = () =>
  import('@/components/simulation/qualification/PickQualifiersSimulation');

export const importJuryScaleRevealSimulation = () =>
  import('@/components/simulation/juryScaleReveal/JuryScaleRevealSimulation');

export const importWinnerModal = () =>
  import('@/components/simulation/WinnerModal');

export const importWinnerConfetti = () =>
  import('@/components/simulation/WinnerConfetti');
