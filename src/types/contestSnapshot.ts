/**
 * Serialized contest snapshot stored on the backend.
 * This is intentionally permissive while the feature evolves.
 */

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
    isJuniorContest?: boolean;
    randomnessLevel?: number;
    pointsSystem?: Array<{ id: number; value: number }>;
    countryOdds?: Array<[code: string, juryOdds: number, televoteOdds: number]>;
    stages: Array<{
      id: string;
      name: string;
      order: number;
      votingMode?: string;
      qualifiesTo?: Array<{ targetStageId: string; amount: number }>;
      participants: string[];
      voters?: string[];
    }>;
  };
  simulation?: {
    pointsSystem?: Array<{ id: number; value: number }>;
    stages: Array<{
      id: string;
      name: string;
      order: number;
      votingMode?: string;
      qualifiesTo?: Array<{ targetStageId: string; amount: number }>;
      participants: string[];
      voters?: string[];
      isOver: boolean;
      isJuryVoting: boolean;
    }>;
    results: {
      predefinedVotes: Record<string, Partial<CompactStageVotes>>;
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
