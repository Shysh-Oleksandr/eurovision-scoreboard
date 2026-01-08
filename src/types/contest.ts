export interface ContestCreator {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
}

export interface Contest {
  _id: string;
  userId: string;
  themeId?: string;
  standardThemeId?: string;
  name: string;
  description?: string;
  isPublic: boolean;
  year?: number;
  hostingCountryCode: string;
  likes: number;
  saves: number;
  snapshotId: string;
  createdAt: string;
  updatedAt: string;
  creator?: ContestCreator;

  // Derived metadata from snapshot
  stageNames: string[];
  customPointsSystem?: Array<number>;
  totalParticipants: number;
  grandFinalParticipants: number;
  customEntriesCount: number;
  isSimulationStarted: boolean;
  winner?: {
    code: string;
    name?: string;
    flag?: string;
  };
}

export interface ContestListResponse {
  contests: Contest[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ContestState {
  likedIds: string[];
  savedIds: string[];
}
