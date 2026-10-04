/**
 * Serialized contest snapshot stored on the backend.
 * This is intentionally permissive while the feature evolves.
 */

import type { ContestType } from '@/data/contestTypes';

export type CompactVote = [countryCode: string, pointsId: number];

export type CompactStageVotes = {
  jury?: Record<string, CompactVote[]>;
  televote?: Record<string, CompactVote[]>;
  combined?: Record<string, CompactVote[]>;
};

export type CountriesStateItem = {
  code: string;
  qualifiedFromStageIds?: string[];
  juryPoints?: number;
  televotePoints?: number;
  isVotingFinished?: boolean; // Only saved if true (false is default)
};

export interface ContestSnapshot {
  _id: string;
  contestId: string;
  schemaVersion: number;
  setup: {
    baseYear: number;
    /** Only saved when not ESC. */
    contestType?: ContestType;
    /** Legacy (pre-`contestType`) snapshots; read via `resolveContestType`. */
    isJuniorContest?: boolean;
    randomnessLevel?: number;
    pointsSpread?: number;
    pointsSystem?: Array<{
      id: number;
      value: number;
      showDouzePoints?: boolean;
    }>;
    splitPointsSystem?: boolean;
    allowMultiplePointsToSameEntry?: boolean;
    juryPointsSystem?: Array<{
      id: number;
      value: number;
      showDouzePoints?: boolean;
    }>;
    televotePointsSystem?: Array<{
      id: number;
      value: number;
      showDouzePoints?: boolean;
    }>;
    countryOdds?: Array<[code: string, juryOdds: number, televoteOdds: number]>;
    stages: Array<{
      id: string;
      name: string;
      order: number;
      votingMode?: string;
      qualifiesTo?: Array<{ targetStageId: string; amount: number }>;
      participants: string[];
      voters?: string[];
      /** Per-voter channel overrides (code -> mode); only non-default entries. */
      voterChannels?: Record<string, 'both' | 'jury' | 'televote'>;
      /** Allocation-draw halves: how many of `participants` form the first half. */
      firstHalfSize?: number;
      overrides?: {
        pointsSystem?: {
          pointsSystem: Array<{
            id: number;
            value: number;
            showDouzePoints?: boolean;
          }>;
          televotePointsSystem?: Array<{
            id: number;
            value: number;
            showDouzePoints?: boolean;
          }>;
          splitPointsSystem?: boolean;
          allowMultiplePointsToSameEntry?: boolean;
        };
        odds?: {
          // [code, juryOdds, televoteOdds] for each of the stage's countries
          countryOdds?: Array<[string, number, number]>;
          randomnessLevel?: number;
          pointsSpread?: number;
        };
      };
    }>;
    /** Allocation draw: rules that differ from official and what a draw left on each stage. */
    allocationDraw?: {
      rules?: Record<string, unknown>;
      drawn?: Record<
        string,
        { code: string; order: string; members: string[]; voters: string[] }
      >;
    };
  };
  simulation?: {
    pointsSystem?: Array<{
      id: number;
      value: number;
      showDouzePoints?: boolean;
    }>;
    juryPointsSystem?: Array<{
      id: number;
      value: number;
      showDouzePoints?: boolean;
    }>;
    televotePointsSystem?: Array<{
      id: number;
      value: number;
      showDouzePoints?: boolean;
    }>;
    stages: Array<{
      id: string;
      name: string;
      order: number;
      votingMode?: string;
      qualifiesTo?: Array<{ targetStageId: string; amount: number }>;
      participants: string[];
      voters?: string[];
      voterChannels?: Record<string, 'both' | 'jury' | 'televote'>;
      isOver: boolean;
      isJuryVoting: boolean;
    }>;
    results: {
      predefinedVotes: Record<string, Partial<CompactStageVotes>>;
      manualShareTotals?: Record<
        string,
        Record<string, { jury?: number; televote?: number; combined?: number }>
      >;
      currentStageId: string | null;
      votingCountryIndex: number;
      votingPointsIndex: number;
      televotingProgress: number;
      currentRevealTelevotePoints?: number;
      winnerCountryCode?: string;
    };
    countriesStateByStage: Record<string, CountriesStateItem[]>;
  };
  customEntriesUsed: Array<{ code: string; name: string; flag: string }>;
  createdAt: string;
  updatedAt: string;
}
