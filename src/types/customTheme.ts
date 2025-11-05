export interface CustomTheme {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  likes: number;
  saves: number;
  duplicatesCount?: number;
  baseThemeYear: string;
  hue: number;
  overrides: Record<string, string>;
  backgroundImageUrl?: string;
  backgroundImageKey?: string;
  createdAt: string;
  updatedAt: string;
  creator?: ThemeCreator;
}

export interface ThemeListResponse {
  themes: CustomTheme[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ThemeState {
  likedIds: string[];
  savedIds: string[];
}

export interface ThemeCreator {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
}
