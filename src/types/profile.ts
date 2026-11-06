import type { UserPreferences } from '@/state/syncedSettings';

export interface Profile {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  email?: string;
  googleId?: string;
  activeThemeId?: string;
  activeContestId?: string;
  isAdmin?: boolean;
  preferredLocale?: PreferredLocale;
  preferences?: UserPreferences;
  /**
   * Last sign-in (or weekly session renewal) on the iOS/Android app; only
   * on the user's own profile. The website stops promoting the apps once
   * it is set.
   */
  appSignedInAt?: string;
}

export interface ProfileSummary {
  followersCount: number;
  followingCount: number;
  customThemesCount: number;
  savedThemesCount: number;
  privateContestsCount: number;
  publicContestsCount: number;
  /** Published graphics designs and saved community designs. */
  designsCount?: number;
  savedDesignsCount?: number;
}

export type PreferredLocale =
  | 'en'
  | 'es'
  | 'fr'
  | 'uk'
  | 'de'
  | 'pl'
  | 'it'
  | 'gr'
  | 'pt';
