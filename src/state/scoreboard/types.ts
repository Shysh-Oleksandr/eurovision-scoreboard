import { BaseCountry, Country, EventMode, EventStage } from '../../models';

export type Vote = {
  countryCode: string;
  points: number;
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
  eventMode: EventMode;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
  showQualificationResults: boolean;
  restartCounter: number;
  showAllParticipants: boolean;
  televotingProgress: number;
  predefinedVotes: Record<string, Partial<StageVotes>>;
  hasShownManualTelevoteWarning: boolean;

  // Getters
  getCurrentStage: () => EventStage;
  getCountryInSemiFinal: (countryCode: string) => Country | null;

  // Actions
  setEventStages: (
    stages: (Omit<EventStage, 'countries'> & { countries: BaseCountry[] })[],
  ) => void;
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: (isRandomFinishing?: boolean) => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
  givePredefinedJuryPoint: () => void;
  givePredefinedTelevotePoints: () => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  toggleShowAllParticipants: () => void;
  setHasShownManualTelevoteWarning: (hasShown: boolean) => void;
  predefineVotesForStage: (
    stage: EventStage,
    resetOtherStages?: boolean,
  ) => void;
};
