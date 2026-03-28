export type EntryStatsParticipationStatus = 'FINAL' | 'NQ';

export interface EntryStatsParticipation {
  contestId: string;
  contestName: string;
  year?: number;
  winnerCode?: string;
  status: EntryStatsParticipationStatus;
  gfRank?: number;
  gfPoints?: number;
}

export interface EntryStatsSummary {
  participations: number;
  finals: number;
  victories: number;
  nulPoints: number;
  lastPlaces: number;
  bestResult: {
    rank: number;
    contestId: string;
    year?: number;
  } | null;
}

export interface EntryStatsResponse {
  entryCode: string;
  summary: EntryStatsSummary;
  participations: EntryStatsParticipation[];
}
