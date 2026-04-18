import {
  THEME_SOUND_EVENTS,
  type ThemeSoundEventId,
} from '@/theme/themeSoundEvents';

export const SOUND_MAX_BYTES = 7 * 1024 * 1024;

export const SOUND_ACCEPT_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
]);

/** Stored in DB as ms; max 60s. */
export const THEME_SOUND_DELAY_MS_MAX = 60_000;

export const THEME_SOUND_DELAY_SEC_MAX = 60;

export const THEME_SOUND_LABEL_KEYS: Record<ThemeSoundEventId, string> = {
  douzePoints: 'soundDouzePoints',
  stageStart: 'soundStageStart',
  pointsAwarded: 'soundPointsAwarded',
  televotePointsReveal: 'soundTelevotePointsReveal',
  winner: 'soundWinner',
  stageComplete: 'soundStageComplete',
  simulationBackground: 'soundSimulationBackground',
  qualifierReveal: 'soundQualifierReveal',
  qualifierPicked: 'soundQualifierPicked',
};

export function emptySoundUrlState(): Record<ThemeSoundEventId, string> {
  return Object.fromEntries(THEME_SOUND_EVENTS.map((e) => [e, ''])) as Record<
    ThemeSoundEventId,
    string
  >;
}

export function emptySoundFileState(): Record<ThemeSoundEventId, File | null> {
  return Object.fromEntries(THEME_SOUND_EVENTS.map((e) => [e, null])) as Record<
    ThemeSoundEventId,
    File | null
  >;
}

export function emptySoundDelaySecTextState(): Record<
  ThemeSoundEventId,
  string
> {
  return Object.fromEntries(THEME_SOUND_EVENTS.map((e) => [e, ''])) as Record<
    ThemeSoundEventId,
    string
  >;
}

export function isValidHttpsSoundUrl(s: string): boolean {
  const u = s.trim();

  return /^https:\/\/.+/i.test(u);
}

/** Seconds typed in the form (float) → ms for API / themeSounds.delayMs. */
export function soundDelaySecondsInputToMs(raw: string): number {
  const t = raw.trim().replace(',', '.');

  if (t === '') return 0;
  const sec = Number(t);

  if (!Number.isFinite(sec) || sec <= 0) return 0;
  const clampedSec = Math.min(THEME_SOUND_DELAY_SEC_MAX, sec);

  return Math.min(THEME_SOUND_DELAY_MS_MAX, Math.round(clampedSec * 1000));
}

/** DB delayMs → seconds string for the form (trimmed float). */
export function soundDelayMsToSecondsInputValue(ms: number): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '';
  const clampedMs = Math.min(THEME_SOUND_DELAY_MS_MAX, Math.floor(ms));

  if (clampedMs <= 0) return '';
  const sec = clampedMs / 1000;
  const rounded = Math.round(sec * 1000) / 1000;

  return String(rounded);
}
