export const THEME_SOUND_EVENTS = [
  'simulationBackground',
  'stageStart',
  'douzePoints',
  'pointsAwarded',
  'televotePointsReveal',
  'qualifierReveal',
  'qualifierPicked',
  'stageComplete',
  'winner',
] as const;

export type ThemeSoundEventId = (typeof THEME_SOUND_EVENTS)[number];
