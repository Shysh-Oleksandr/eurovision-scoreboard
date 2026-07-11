import type { ConfirmationPreferences } from './confirmationStore';
import type { PresentationSettings, Settings } from './generalStore';
import {
  DEFAULT_DIASPORA_SETTINGS,
  DiasporaSettings,
} from './scoreboard/diaspora';

/*
 * The slice of client state that round-trips to the user's account
 * (`GET/PATCH /profiles/me/preferences`), loaded on login and debounced-saved on
 * change by `SyncUserPreferences`.
 *
 * These whitelists are the single source of truth for "what syncs" — adding a
 * future synced setting is a one-line change here. Only fields that are genuine
 * global user preferences belong here; deliberately EXCLUDED are:
 *   - contest-bound fields (restored from a loaded contest — syncing them would
 *     let a contest-load overwrite, then re-save, your account default):
 *     contest identity, points systems, randomnessLevel, pointsSpread,
 *     splitPointsSystem, allowMultiplePointsToSameEntry, odds.
 *   - device-local: customBgImage (IndexedDB blob) + shouldUseCustomBgImage.
 *   - per-export / transient: imageCustomization, presentationSettings.isPresenting.
 *   - already synced elsewhere: language (profile.preferredLocale).
 */
export const SYNCED_SETTINGS_KEYS = [
  'diaspora',
  // display / UI
  'shouldShowHeartFlagIcon',
  'alwaysShowRankings',
  'showRankChangeIndicator',
  'showQualificationModal',
  'showQualifierTargetStages',
  'showWinnerModal',
  'showWinnerConfetti',
  'enableFullscreen',
  'shouldShowJuryVotingProgress',
  'blurModalBackground',
  'showHostingCountryLogo',
  'enableMinimalisticFlags',
  'hideVotingHints',
  'enableIconButtonTooltips',
  'oddsRankLayout',
  'enableWinterEffects',
  'snowFallIntensity',
  'overrideThemeFont',
  'overrideThemeFontAlias',
  'enableFinalReveal',
  'finalRevealAnimationSpeed',
  'finalRevealLinearAnimation',
  // audio
  'disableAllThemeAudio',
  'hideThemeSoundVolumeHud',
  'themeSoundVolume',
  'themeAmbienceVolume',
  // voting / reveal behavior (user habits, not contest-bound)
  'isPickQualifiersMode',
  'enableSplitScreenQualifierRevealMode',
  'enableSplitScreenForLastQualifier',
  'splitScreenCandidatesCount',
  'revealTelevoteLowestToHighest',
  'shouldLimitManualTelevotePoints',
  'useGroupedJuryPoints',
  'enablePredefinedVotes',
  'autoStartPresentation',
  'presentationModeEnabled',
] as const satisfies readonly (keyof Settings)[];

export const SYNCED_PRESENTATION_KEYS = [
  'presentationSpeedSeconds',
  'presentationJuryGrouping',
  'pauseAfterAnimatedPoints',
  'scoreboardMobileLayout',
] as const satisfies readonly (keyof PresentationSettings)[];

export type SyncedSettings = Partial<
  Pick<Settings, (typeof SYNCED_SETTINGS_KEYS)[number]>
>;
export type SyncedPresentation = Partial<
  Pick<PresentationSettings, (typeof SYNCED_PRESENTATION_KEYS)[number]>
>;

export type UserPreferences = {
  settings?: SyncedSettings;
  presentation?: SyncedPresentation;
  confirmations?: ConfirmationPreferences;
};

const pickKeys = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> => {
  const out = {} as Pick<T, K>;

  for (const k of keys) out[k] = obj[k];

  return out;
};

/** Snapshot the account-synced slice out of the live stores. */
export const toUserPreferences = (
  settings: Settings,
  presentation: PresentationSettings,
  confirmations: ConfirmationPreferences,
): UserPreferences => ({
  settings: pickKeys(settings, SYNCED_SETTINGS_KEYS),
  presentation: pickKeys(presentation, SYNCED_PRESENTATION_KEYS),
  confirmations,
});

/**
 * Merge a server-saved diaspora slice over the current defaults, so fields added
 * after the user last saved still get sane values. Returns null when nothing is
 * saved yet (caller then seeds the account from local state).
 */
export const mergeDiasporaPreference = (
  saved: Partial<DiasporaSettings> | undefined,
): DiasporaSettings | null =>
  saved ? { ...DEFAULT_DIASPORA_SETTINGS, ...saved } : null;

export interface ApplyPreferencesActions {
  setSettings: (settings: Partial<Settings>) => void;
  setPresentationSettings: (settings: Partial<PresentationSettings>) => void;
  setConfirmations: (confirmations: ConfirmationPreferences) => void;
}

/** True when the account has anything saved (vs. a brand-new empty blob). */
export const hasSavedPreferences = (prefs: UserPreferences): boolean =>
  Boolean(prefs.settings || prefs.presentation || prefs.confirmations);

/** Apply account preferences onto the live stores (server-wins hydrate). */
export const applyUserPreferences = (
  prefs: UserPreferences,
  actions: ApplyPreferencesActions,
): void => {
  if (prefs.settings) {
    const { diaspora, ...rest } = prefs.settings;
    const next: Partial<Settings> = { ...rest };
    const mergedDiaspora = mergeDiasporaPreference(diaspora);

    if (mergedDiaspora) next.diaspora = mergedDiaspora;
    // setSettings shallow-merges, so contest-bound / device-local fields are
    // left untouched.
    actions.setSettings(next);
  }
  if (prefs.presentation) actions.setPresentationSettings(prefs.presentation);
  if (prefs.confirmations) actions.setConfirmations(prefs.confirmations);
};
