import { BaseCountry, Country, EventStage } from '../../models';

export type Vote = {
  countryCode: string;
  points: number;
  pointsId: number;
  showDouzePointsAnimation: boolean;
};

export type CountryPoints = {
  juryPoints: number;
  televotePoints: number;
  combinedPoints: number;
};

export type QualificationOrder = Record<string, Record<string, number>>; // stageId -> countryCode -> qualificationOrder

export type RevealData = {
  leaderCode: string;
  lastCode: string;
  pointsNeeded: number;
};

// Televote award for the last Grand Final country that has been buffered (not yet
// applied to the board) so the final reveal animation can drive it. See
// `getFinalRevealInfo` and the `giveTelevotePoints` guard.
export type PendingFinalRevealTelevote = {
  countryCode: string;
  points: number;
};

export type ManualShareTotalsRow = {
  jury?: number;
  televote?: number;
  combined?: number;
};

export type ManualShareTotalsByStage = Record<
  string,
  Record<string, ManualShareTotalsRow>
>; // stageId -> countryCode -> ManualShareTotalsRow

export type StageVotes = {
  jury?: Record<string, Vote[]>; // voting country code -> votes
  televote?: Record<string, Vote[]>; // voting country code -> votes
  combined?: Record<string, Vote[]>;
};

export type SplitScreenQualifierCandidate = Pick<
  BaseCountry,
  'code' | 'name' | 'flag'
>;

export type ScoreboardState = {
  // State
  eventStages: EventStage[];
  currentStageId: string | null;
  viewedStageId: string | null;
  votingCountryIndex: number;
  votingPointsIndex: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
  showQualificationResults: boolean;
  restartCounter: number; // It's needed to trigger restart event when clicking "Restart" button
  startCounter: number; // It's needed for board initial animation when clicking "Start" button
  // True while replaying a saved contest in presentation mode. The predefined
  // votes already in the store are authoritative and must be replayed as-is:
  // stage transitions must not regenerate votes, and the predefinition modal
  // (when the user has enablePredefinedVotes on) prefills from them.
  isReplayingSavedVotes: boolean;
  showAllParticipants: boolean;
  televotingProgress: number;
  predefinedVotes: Record<string, Partial<StageVotes>>;
  manualShareTotals: ManualShareTotalsByStage;
  countryPoints: Record<string, Record<string, CountryPoints>>; // stageId -> countryCode -> CountryPoints
  lastPointsResetTimerId: NodeJS.Timeout | null;
  isBoardTeleportAnimationRunning: boolean;
  shouldResetLastPointsAfterTeleport: boolean;
  qualificationOrder: QualificationOrder;
  currentRevealTelevotePoints: number; // Current points to give in reveal mode
  isWinnerAnimationAlreadyDisplayed: boolean;
  revealData: RevealData | null;
  isRevealAnimationComplete: boolean;
  pendingFinalRevealTelevote: PendingFinalRevealTelevote | null;
  isLastSimulationAnimationFinished: boolean;
  splitScreenQualifierModalOpen: boolean;
  splitScreenQualifierCandidates: SplitScreenQualifierCandidate[];
  splitScreenQualifierCandidatesStageId: string | null;
  splitScreenQualifierCandidatesQualifiedCount: number | null;
  splitScreenQualifierShownCountByStage: Record<string, Record<string, number>>;
  splitScreenQualifierLastShownByStage: Record<string, string[]>;

  // Getters
  getCurrentStage: () => EventStage | undefined;
  getNextStage: () => EventStage | null;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
  getVotingPoints: () => number;
  getNextLowestTelevoteCountry: () => {
    country: Country | null;
    points: number;
  } | null; // Get next country to receive points in reveal mode
  // Actions
  setEventStages: (eventStages: EventStage[]) => void;
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (
    countryCode: string,
    votingPoints: number,
    options?: { fromFinalReveal?: boolean },
  ) => void;
  commitPendingFinalRevealTelevote: () => void;
  giveRandomJuryPoints: () => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
  givePredefinedJuryPoint: () => void;
  givePredefinedJuryPointsGrouped: () => void;
  givePredefinedTelevotePoints: () => void;
  giveManualTelevotePointsInRevealMode: (countryCode: string) => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: () => void;
  triggerRestartEvent: () => void;
  leaveEvent: () => void;
  prepareForNextStage: (shouldUpdateStore?: boolean) => {
    updatedEventStages: EventStage[];
    nextStage: EventStage | null;
    currentStageIndex: number;
  };
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  toggleShowAllParticipants: () => void;
  setViewedStageId: (stageId: string | null) => void;
  setCurrentStageId: (stageId: string | null) => void;
  hideDouzePointsAnimation: (countryCode: string) => void;
  setBoardTeleportAnimationRunning: (isRunning: boolean) => void;
  setShouldResetLastPointsAfterTeleport: (shouldReset: boolean) => void;
  handleBoardTeleportAnimationComplete: (
    hasDouzePointsAnimation: boolean,
  ) => void;
  setIsLastSimulationAnimationFinished: (isFinished: boolean) => void;
  setCurrentRevealTelevotePoints: (points: number) => void; // Set current points to give in reveal mode
  setIsWinnerAnimationAlreadyDisplayed: (hasShown: boolean) => void;
  setRevealData: (data: RevealData | null) => void;
  setIsRevealAnimationComplete: (complete: boolean) => void;
  clearReveal: () => void;
  predefineVotesForStage: (
    stage: EventStage,
    resetOtherStages?: boolean,
  ) => void;
  setPredefinedVotesForStage: (
    stage: EventStage,
    votes: Partial<StageVotes>,
    resetOtherStages?: boolean,
  ) => void;
  setManualShareTotalsForStage: (
    stageId: string,
    partial: Record<string, Partial<ManualShareTotalsRow>>,
  ) => void;
  pickQualifier: (countryCode: string) => void;
  pickQualifierRandomly: () => void;
  openSplitScreenQualifierModal: () => boolean;
  closeSplitScreenQualifierModal: () => void;
  computeSplitScreenQualifierCandidatesIfNeeded: () => boolean;
  pickQualifierFromSplitScreenCandidatesRandomly: () => void;
};
