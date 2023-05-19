export interface Country {
  name: string;
  code: string;
  isQualified: boolean;
  flag: string;
  points: number;
  lastReceivedPoints: number;
}

export enum ScoreboardActionKind {
  GIVE_POINTS = 'GIVE_POINTS',
  GIVE_RANDOM_POINTS = 'GIVE_RANDOM_POINTS',
  RESET_LAST_POINTS = 'RESET_LAST_POINTS',
  HIDE_LAST_RECEIVED_POINTS = 'HIDE_LAST_RECEIVED_POINTS',
}

export interface ScoreboardAction {
  type: ScoreboardActionKind;
  payload?: {
    countryCode?: string;
  };
}

export interface CountryWithPoints {
  code: string;
  points: number;
}
