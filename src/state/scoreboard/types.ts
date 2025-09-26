import { BaseCountry, Country, EventMode, EventStage } from '../../models';

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

export type StageVotes = {
  jury?: Record<string, Vote[]>; // voting country code -> votes
  televote?: Record<string, Vote[]>; // voting country code -> votes
  combined?: Record<string, Vote[]>;
};

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
  showAllParticipants: boolean;
  televotingProgress: number;
  predefinedVotes: Record<string, Partial<StageVotes>>;
  countryPoints: Record<string, Record<string, CountryPoints>>; // stageId -> countryCode -> CountryPoints
  hasShownManualTelevoteWarning: boolean;
  lastPointsResetTimerId: NodeJS.Timeout | null;
  qualificationOrder: QualificationOrder;
  currentRevealTelevotePoints: number; // Current points to give in reveal mode

  // Getters
  getCurrentStage: () => EventStage;
  getNextStage: () => EventStage | null;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
  getVotingPoints: () => number;
  getNextLowestTelevoteCountry: () => {
    country: Country | null;
    points: number;
  } | null; // Get next country to receive points in reveal mode
  // Actions
  setEventStages: (
    stages: (Omit<EventStage, 'countries'> & { countries: BaseCountry[] })[],
  ) => void;
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: () => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
  givePredefinedJuryPoint: () => void;
  givePredefinedJuryPointsGrouped: () => void;
  givePredefinedTelevotePoints: () => void;
  giveManualTelevotePointsInRevealMode: (countryCode: string) => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
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
  setHasShownManualTelevoteWarning: (hasShown: boolean) => void;
  hideDouzePointsAnimation: (countryCode: string) => void;
  setCurrentRevealTelevotePoints: (points: number) => void; // Set current points to give in reveal mode
  predefineVotesForStage: (
    stage: EventStage,
    resetOtherStages?: boolean,
  ) => void;
  setPredefinedVotesForStage: (
    stage: EventStage,
    votes: Partial<StageVotes>,
    resetOtherStages?: boolean,
  ) => void;
  pickQualifier: (countryCode: string) => void;
  pickQualifierRandomly: () => void;
};
