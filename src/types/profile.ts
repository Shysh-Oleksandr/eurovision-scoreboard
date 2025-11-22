export interface Profile {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  email?: string;
  googleId?: string;
  activeThemeId?: string;
  isAdmin?: boolean;
  preferredLocale?: PreferredLocale;
}

export type PreferredLocale = 'en' | 'es' | 'uk';
