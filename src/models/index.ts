export interface BaseCountry {
  name: string;
  code: string;
  category?: string;
  flag?: string;
  isQualified?: boolean;
  semiFinalGroup?: string;
  aqSemiFinalGroup?: string;
  isAutoQualified?: boolean;
  isQualifiedFromSemi?: boolean;
  juryOdds?: number;
  televoteOdds?: number;
  spokespersonOrder?: number;
}

export type SemiFinalGroup = 'SF1' | 'SF2';

export enum CountryAssignmentGroup {
  AUTO_QUALIFIER = 'AUTO_QUALIFIER',
  SF1 = 'SF1',
  SF2 = 'SF2',
  NOT_QUALIFIED = 'NOT_QUALIFIED',
  NOT_PARTICIPATING = 'NOT_PARTICIPATING',
}

export enum EventMode {
  GRAND_FINAL_ONLY = 'GRAND_FINAL_ONLY',
  SEMI_FINALS_AND_GRAND_FINAL = 'SEMI_FINALS_AND_GRAND_FINAL',
}

export interface SemiFinalQualifiersAmount {
  SF1: number;
  SF2: number;
}

export enum StageVotingMode {
  JURY_AND_TELEVOTE = 'JURY_AND_TELEVOTE',
  TELEVOTE_ONLY = 'TELEVOTE_ONLY',
  JURY_ONLY = 'JURY_ONLY',
  COMBINED = 'COMBINED',
}

export enum StageVotingType {
  JURY = 'JURY',
  TELEVOTE = 'TELEVOTE',
}

export interface EventStage {
  id: string;
  name: string;
  votingMode: StageVotingMode;
  countries: Country[];
  votingCountries?: BaseCountry[];
  syncVotersWithParticipants?: boolean;
  isOver: boolean;
  isJuryVoting: boolean;
  isLastStage?: boolean;
  qualifiersAmount?: number;
}

export enum StageId {
  SF1 = 'sf1',
  SF2 = 'sf2',
  GF = 'gf',
}

export interface Country extends BaseCountry {
  juryPoints: number;
  televotePoints: number;
  points: number;
  lastReceivedPoints: number | null;
  isVotingFinished?: boolean;
  showDouzePointsAnimation?: boolean;
}

export interface CountryWithPoints {
  code: string;
  points: number;
  showDouzePointsAnimation: boolean;
}

export enum StatsTableType {
  BREAKDOWN = 'Breakdown',
  SPLIT = 'Split',
  SUMMARY = 'Summary',
}
