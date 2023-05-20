export interface Country {
  name: string;
  code: string;
  isQualified: boolean;
  flag: string;
  points: number;
  lastReceivedPoints: number;
  isVotingFinished?: boolean;
}

export enum ScoreboardActionKind {
  GIVE_JURY_POINTS = 'GIVE_JURY_POINTS',
  GIVE_TELEVOTE_POINTS = 'GIVE_TELEVOTE_POINTS',
  GIVE_RANDOM_POINTS = 'GIVE_RANDOM_POINTS',
  RESET_LAST_POINTS = 'RESET_LAST_POINTS',
  HIDE_LAST_RECEIVED_POINTS = 'HIDE_LAST_RECEIVED_POINTS',
  START_OVER = 'START_OVER',
}

export interface ScoreboardAction {
  type: ScoreboardActionKind;
  payload?: {
    countryCode?: string;
    votingPoints?: number;
  };
}

export interface CountryWithPoints {
  code: string;
  points: number;
}
