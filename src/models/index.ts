export interface BaseCountry {
  name: string;
  code: string;
  category?: string;
  flag?: string;
  isQualified?: boolean;
  semiFinalGroup?: SemiFinalGroup;
  isAutoQualified?: boolean;
  isQualifiedFromSemi?: boolean;
}

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
  GRAND_FINAL_ONLY = 'GRAND_FINAL_ONLY',
  SEMI_FINALS_AND_GRAND_FINAL = 'SEMI_FINALS_AND_GRAND_FINAL',
}

export interface SemiFinalQualifiersAmount {
  SF1: number;
  SF2: number;
}

export enum StageVotingMode {
  TELEVOTE_ONLY = 'TELEVOTE_ONLY',
  JURY_ONLY = 'JURY_ONLY',
  TELEVOTE_AND_JURY = 'TELEVOTE_AND_JURY',
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
  isOver: boolean;
  isJuryVoting: boolean;
  isLastStage?: boolean;
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
}

export interface CountryWithPoints {
  code: string;
  points: number;
}
