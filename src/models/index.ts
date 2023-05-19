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
  SET_SHOW_LAST_POINTS = 'SET_SHOW_LAST_POINTS',
}

export interface ScoreboardAction {
  type: ScoreboardActionKind;
  payload?: {
    countryCode?: string;
    shouldShowLastPoints?: boolean;
  };
}

export interface CountryWithPoints {
  code: string;
  points: number;
}
