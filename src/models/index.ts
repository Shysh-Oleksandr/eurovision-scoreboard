export interface BaseCountry {
  // Fields that can be derived from the preset countries file
  name: string;
  code: string;
  category?: string;
  isQualified?: boolean;
  semiFinalGroup?: string;
  aqSemiFinalGroup?: string;
  isAutoQualified?: boolean;
  juryOdds?: number;
  televoteOdds?: number;
  spokespersonOrder?: number;

  // Fields set during simulation
  /**
   * IDs of stages from which this country has qualified (in order).
   * Useful for multi-stage qualification chains.
   */
  qualifiedFromStageIds?: string[];

  // Fields for custom entries only
  isImported?: boolean; // set to true when imported from others' contest snapshots
  flag?: string;
  updatedAt?: string; // For custom entries
}

export type SemiFinalGroup = 'SF1' | 'SF2';

export enum CountryAssignmentGroup {
  SF1 = 'SF1',
  SF2 = 'SF2',
  NOT_QUALIFIED = 'NOT_QUALIFIED',
  NOT_PARTICIPATING = 'NOT_PARTICIPATING',
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

export interface QualifierTarget {
  targetStageId: string;
  amount: number;
}

export type VotingCountry = Pick<BaseCountry, 'code' | 'name' | 'flag'>;

export interface EventStage {
  id: string;
  name: string;
  order: number; // Explicit ordering for stage sequence
  votingMode: StageVotingMode;
  countries: Country[];
  votingCountries?: VotingCountry[];
  isOver: boolean;
  isJuryVoting: boolean;
  isLastStage?: boolean;
  qualifiesTo?: QualifierTarget[]; // Which stages this stage qualifies to and how many
  isPreparedForNextStage?: boolean; // is set to true when user opens predefinition modal; needed to call prepareForNextStage only once
}

export enum StageId {
  SF1 = 'SF1',
  SF2 = 'SF2',
  GF = 'GF',
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
