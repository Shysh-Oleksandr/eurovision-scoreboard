import {
  BoardAnimationMode,
  DouzePointsAnimationMode,
  FlagShape,
  PointsContainerShape,
  ThemeSpecifics,
} from '@/theme/types';
import type { ThemeSoundEventId } from '@/theme/themeSoundEvents';

export type { BoardAnimationMode, DouzePointsAnimationMode };

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
  shadeValue?: number;
  overrides: Record<string, string>;
  backgroundImageUrl?: string;
  backgroundImageKey?: string;
  themeSounds?: Partial<
    Record<ThemeSoundEventId, { url: string; key?: string; delayMs?: number }>
  >;
  hasCustomAudio?: boolean;
  pointsContainerShape?: PointsContainerShape;
  uppercaseEntryName?: boolean;
  juryActivePointsUnderline?: boolean;
  isJuryPointsPanelRounded?: boolean;
  flagShape?: FlagShape;
  usePointsCountUpAnimation?: boolean;
  boardAnimationMode?: BoardAnimationMode;
  douzePointsAnimationMode?: DouzePointsAnimationMode;
  themeSpecifics?: Partial<ThemeSpecifics>;
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
  quickSelectedIds: string[];
}

export interface ThemeCreator {
  _id: string;
  username: string;
  name?: string;
  country?: string;
  avatarUrl?: string;
  createdAt?: string;
  followerCount?: number;
  isFollowing?: boolean;
}
