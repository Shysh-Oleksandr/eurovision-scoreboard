import { BaseCountry, Country, EventMode, EventStage } from '../../models';

export interface ScoreboardState {
  // State
  eventStages: EventStage[];
  currentStageId: string | null;
  votingCountryIndex: number;
  votingPoints: number;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  winnerCountry: Country | null;
  eventMode: EventMode;
  showQualificationResults: boolean;
  restartCounter: number;
  showAllParticipants: boolean;
  canDisplayPlaceAnimation: boolean;
  televotingProgress: number;

  // Actions
  getCurrentStage: () => EventStage;
  getCountryInSemiFinal: (countryCode: string) => Country | null;
  setEventStages: (
    stages: (Omit<EventStage, 'countries'> & { countries: BaseCountry[] })[],
  ) => void;
  giveJuryPoints: (countryCode: string) => void;
  giveTelevotePoints: (countryCode: string, votingPoints: number) => void;
  giveRandomJuryPoints: (isRandomFinishing?: boolean) => void;
  finishJuryVotingRandomly: () => void;
  finishTelevoteVotingRandomly: () => void;
  resetLastPoints: () => void;
  hideLastReceivedPoints: () => void;
  startEvent: (mode: EventMode, selectedCountries: BaseCountry[]) => void;
  continueToNextPhase: () => void;
  closeQualificationResults: () => void;
  toggleShowAllParticipants: () => void;
  setCanDisplayPlaceAnimation: (canDisplay: boolean) => void;
}
