import { BaseCountry, Country, EventMode, EventStage } from '../../models';

export type Vote = {
  countryCode: string;
  points: number;
  pointsId: number;
  showDouzePointsAnimation: boolean;
};

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
  eventMode: EventMode;
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
  hasShownManualTelevoteWarning: boolean;
  randomnessLevel: number;
  lastPointsResetTimerId: number | null;

  // Getters
  getCurrentStage: () => EventStage;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
  getVotingPoints: () => number;
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
  givePredefinedTelevotePoints: () => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
  triggerRestartEvent: () => void;
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  toggleShowAllParticipants: () => void;
  setViewedStageId: (stageId: string | null) => void;
  setHasShownManualTelevoteWarning: (hasShown: boolean) => void;
  setRandomnessLevel: (level: number) => void;
  hideDouzePointsAnimation: (countryCode: string) => void;
  predefineVotesForStage: (
    stage: EventStage,
    resetOtherStages?: boolean,
  ) => void;
};
