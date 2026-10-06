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
}

export interface ProfileSummary {
  followersCount: number;
  followingCount: number;
  customThemesCount: number;
  savedThemesCount: number;
  privateContestsCount: number;
  publicContestsCount: number;
  /** Published graphics templates / saved community templates. */
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
