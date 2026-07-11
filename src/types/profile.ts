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
