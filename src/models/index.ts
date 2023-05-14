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
}

export interface ScoreboardAction {
  type: ScoreboardActionKind;
  payload?: string;
}

export interface ScoreboardState {
  countries: Country[];
  isJuryVoting: boolean;
  votingCountryIndex: number;
  votingPoints: number;
}

export interface CountryWithPoints {
  code: string;
  points: number;
}
