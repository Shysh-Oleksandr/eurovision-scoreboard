export const THEME_SOUND_EVENTS = [
  'douzePoints',
  'stageStart',
  'pointsAwarded',
  'televotePointsReveal',
  'winner',
  'stageComplete',
  'simulationBackground',
  'qualifierReveal',
  'qualifierPicked',
] as const;

export type ThemeSoundEventId = (typeof THEME_SOUND_EVENTS)[number];
