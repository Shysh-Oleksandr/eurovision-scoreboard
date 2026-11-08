export type EntryStatsParticipationStatus = 'FINAL' | 'NQ';

/** Hosted contests also list the ones the host sat out. */
export type EntryStatsHostedStatus =
  | EntryStatsParticipationStatus
  | 'NOT_COMPETING';

/** The last stage before the grand final that the entry competed in. */
export interface EntryStatsSemiResult {
  stageId: string;
  stageName: string;
  rank: number;
  /** Entries in that stage. */
  size: number;
  points: number;
}

export interface EntryStatsParticipation {
  contestId: string;
  contestName: string;
  year?: number;
  contestCreatedAt?: string;
  winnerCode?: string;
  status: EntryStatsParticipationStatus;
  gfRank?: number;
  gfPoints?: number;
  /** Number of entries in that grand final. */
  gfSize?: number;
  /** Set when the entry competed before the grand final. */
  semi?: EntryStatsSemiResult;
  /** In the grand final without competing in the contest's earlier stages. */
  preQualified?: boolean;
  /** Only when the grand final had separate jury and televote. */
  gfJury?: number;
  gfTelevote?: number;
  /** Shared ranks: 1 + entries with strictly more points. */
  gfJuryRank?: number;
  gfTelevoteRank?: number;
}

export interface EntryStatsHostedContest
  extends Omit<EntryStatsParticipation, 'status'> {
  status: EntryStatsHostedStatus;
}

export interface EntryStatsResult {
  rank: number;
  contestId: string;
  year?: number;
}

export interface EntryStatsSummary {
  participations: number;
  finals: number;
  victories: number;
  nulPoints: number;
  lastPlaces: number;
  /** Grand finals finished in the top 10. */
  top10: number;
  /** Mean grand final place; null without a final. */
  averageRank: number | null;
  /** Contests where the entry competed before the grand final. */
  semiFinals: number;
  /** Of those, how many reached the grand final. */
  qualifiedFromSemis: number;
  /** Grand finals reached without competing in earlier stages. */
  preQualified: number;
  /** Grand finals topped by the jury / the televote (ties count for all). */
  juryWins: number;
  televoteWins: number;
  /** Over grand finals with separate jury and televote; null without one. */
  averageJuryRank: number | null;
  averageTelevoteRank: number | null;
  bestResult: EntryStatsResult | null;
  worstResult: EntryStatsResult | null;
}

export interface EntryStatsResponse {
  entryCode: string;
  summary: EntryStatsSummary;
  participations: EntryStatsParticipation[];
  /** Contests whose hosting country is this entry, competing or not. */
  hostedContests: EntryStatsHostedContest[];
  customEntriesUsed: Array<{ code: string; name: string; flag: string }>;
}
