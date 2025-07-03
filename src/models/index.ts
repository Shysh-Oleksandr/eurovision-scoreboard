export type BaseCountry = {
  name: string;
  code: string;
  category?: string;
  flag?: string;
  isQualified?: boolean;
  semiFinalGroup?: SemiFinalGroup;
  countryAssignmentGroup?: CountryAssignmentGroup;
  isAutoQualified?: boolean;
  isSelected?: boolean;
  isQualifiedFromSemi?: boolean;
};

export type SemiFinalGroup = 'SF1' | 'SF2';

export enum CountryAssignmentGroup {
  SF1 = 'SF1',
  SF2 = 'SF2',
  AUTO_QUALIFIER = 'AUTO_QUALIFIER',
  NOT_PARTICIPATING = 'NOT_PARTICIPATING',
  GRAND_FINAL = 'GRAND_FINAL',
  NOT_QUALIFIED = 'NOT_QUALIFIED',
}

export enum EventMode {
  SEMI_FINALS_AND_GRAND_FINAL = 'SEMI_FINALS_AND_GRAND_FINAL',
  GRAND_FINAL_ONLY = 'GRAND_FINAL_ONLY',
}
export enum EventPhase {
  COUNTRY_SELECTION = 'COUNTRY_SELECTION',
  SEMI_FINAL_1 = 'SEMI_FINAL_1',
  SEMI_FINAL_2 = 'SEMI_FINAL_2',
  GRAND_FINAL = 'GRAND_FINAL',
}

export type SemiFinalQualifiersAmount = {
  SF1: number;
  SF2: number;
};

export type Country = BaseCountry & {
  points: number;
  lastReceivedPoints: number | null;
  isVotingFinished?: boolean;
};

export enum ScoreboardActionKind {
  GIVE_JURY_POINTS = 'GIVE_JURY_POINTS',
  GIVE_TELEVOTE_POINTS = 'GIVE_TELEVOTE_POINTS',
  GIVE_RANDOM_JURY_POINTS = 'GIVE_RANDOM_JURY_POINTS',
  RESET_LAST_POINTS = 'RESET_LAST_POINTS',
  HIDE_LAST_RECEIVED_POINTS = 'HIDE_LAST_RECEIVED_POINTS',
  START_OVER = 'START_OVER',
}

export interface ScoreboardAction {
  type: ScoreboardActionKind;
  payload?: {
    countryCode?: string;
    votingPoints?: number;
    isRandomFinishing?: boolean;
  };
}

export interface CountryWithPoints {
  code: string;
  points: number;
}

export type PresenterPointGrouping = 'grouped' | 'individual';

export type PresenterPhase = 'lower-points' | 'twelve-points' | 'transitioning';

export interface PresetJuryVote {
  votingCountryCode: string;
  points: { [receivingCountryCode: string]: number };
}

export interface PresetTelevoteVote {
  countryCode: string;
  points: number;
}

export interface PresenterSettings {
  isPresenterMode: boolean;
  pointGrouping: PresenterPointGrouping;
  presetJuryVotes: PresetJuryVote[];
  presetTelevoteVotes: PresetTelevoteVote[];
  currentPlayingCountryIndex: number;
  isAutoPlaying: boolean;
  currentPhase: PresenterPhase;
  currentMessageCountryIndex: number; // Separate index for message display
  currentAnnouncingPoints: number | null; // Track current point value being announced in individual mode
}
