export interface CustomTheme {
  _id: string;
  name: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  likes: number;
  baseThemeYear: string;
  hue: number;
  overrides: Record<string, string>;
  backgroundImageUrl?: string;
  backgroundImageKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeListResponse {
  themes: CustomTheme[];
  total: number;
  page: number;
  totalPages: number;
}
