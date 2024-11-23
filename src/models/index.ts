export type BaseCountry = {
  name: string;
  code: string;
  flag: string;
  isQualified: boolean;
};

export type Country = BaseCountry & {
  points: number;
  lastReceivedPoints: number;
  isVotingFinished?: boolean;
};

export enum ScoreboardActionKind {
  GIVE_JURY_POINTS = 'GIVE_JURY_POINTS',
  GIVE_TELEVOTE_POINTS = 'GIVE_TELEVOTE_POINTS',
  GIVE_RANDOM_JURY_POINTS = 'GIVE_RANDOM_JURY_POINTS',
  RESET_LAST_POINTS = 'RESET_LAST_POINTS',
  HIDE_LAST_RECEIVED_POINTS = 'HIDE_LAST_RECEIVED_POINTS',
  TRIGGER_RERENDER = 'TRIGGER_RERENDER',
  START_OVER = 'START_OVER',
}

export interface ScoreboardAction {
  type: ScoreboardActionKind;
  payload?: {
    countryCode?: string;
    votingPoints?: number;
    isRandomFinishing?: boolean;
  };
}

export interface CountryWithPoints {
  code: string;
  points: number;
}
