export type PublicLeaderboardRow = {
  code: string;
  wins: number;
  finals: number;
  participations: number;
  winRate: number | null;
  podiums: number;
  top5: number;
  top10: number;
  avgGrandFinalPoints: number | null;
  totalGrandFinalPoints: number;
};

export type PublicLeaderboardResponse = {
  computedAt: string;
  scope: 'global' | 'year';
  year: number | null;
  contestCount: number;
  rows: PublicLeaderboardRow[];
};

export type CustomEntryMeta = { code: string; name: string; flag: string };

export type MyLeaderboardResponse = {
  contestCount: number;
  rows: PublicLeaderboardRow[];
  customEntries: CustomEntryMeta[];
};
